"""Create a private demo snapshot or restore it into an empty PostgreSQL database.

Credentials come only from .env/process environment, never command arguments or logs.
Requires PostgreSQL client tools matching or newer than the source server.
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


def connection_env(url: str) -> dict[str, str]:
    parts = urlsplit(url.replace("postgresql+psycopg://", "postgresql://", 1))
    if (
        parts.scheme not in ("postgres", "postgresql")
        or not parts.hostname
        or not parts.path.strip("/")
    ):
        raise ValueError("Invalid PostgreSQL connection URL")
    env = os.environ.copy()
    env.update(
        PGHOST=parts.hostname,
        PGPORT=str(parts.port or 5432),
        PGDATABASE=unquote(parts.path.lstrip("/")),
        PGUSER=unquote(parts.username or ""),
        PGPASSWORD=unquote(parts.password or ""),
        PGCONNECT_TIMEOUT="10",
    )
    options = parse_qs(parts.query)
    for key, value in options.items():
        if key in {
            "sslmode",
            "sslrootcert",
            "sslcert",
            "sslkey",
            "channel_binding",
            "options",
        }:
            env["PG" + key.replace("_", "").upper()] = value[-1]
    return env


def pgtool(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f"Install PostgreSQL client tools and add {name} to PATH")
    return found


def normalized(url: str) -> str:
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


def database_tables(url: str) -> dict[str, int]:
    with psycopg.connect(normalized(url), connect_timeout=10) as conn:
        rows = conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        ).fetchall()
        from psycopg import sql

        return {
            name: conn.execute(
                sql.SQL("SELECT count(*) FROM public.{}").format(sql.Identifier(name))
            ).fetchone()[0]
            for (name,) in rows
        }


def export(source: str, output: Path) -> None:
    if output.exists() or output.with_suffix(".manifest.json").exists():
        raise ValueError("Output already exists; choose a new snapshot filename")
    output.parent.mkdir(parents=True, exist_ok=True)
    # A repeatable-read transaction pins the snapshot used by pg_dump and its counts.
    from psycopg import sql

    with psycopg.connect(normalized(source), connect_timeout=10) as conn:
        conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        snapshot = conn.execute("SELECT pg_export_snapshot()").fetchone()[0]
        names = [
            r[0]
            for r in conn.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
            )
        ]
        counts = {
            name: conn.execute(
                sql.SQL("SELECT count(*) FROM public.{}").format(sql.Identifier(name))
            ).fetchone()[0]
            for name in names
        }
        subprocess.run(
            [
                pgtool("pg_dump"),
                "--format=custom",
                "--no-owner",
                "--no-privileges",
                "--schema=public",
                f"--snapshot={snapshot}",
                f"--file={output}",
            ],
            env=connection_env(source),
            check=True,
            capture_output=True,
            timeout=180,
        )
    with output.open("rb") as file:
        digest = hashlib.file_digest(file, "sha256").hexdigest()
    manifest = {
        "format": 1,
        "created": datetime.now(UTC).isoformat(),
        "sha256": digest,
        "tables": counts,
    }
    output.with_suffix(".manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(
        f"Snapshot created: {output.name}; {len(counts)} tables; {output.stat().st_size:,} bytes. Keep it private and outside Git."
    )


def restore(target: str, source: str | None, snapshot: Path) -> None:
    if source:
        a, b = urlsplit(normalized(source)), urlsplit(normalized(target))
        if (a.hostname, a.port or 5432, unquote(a.path)) == (
            b.hostname,
            b.port or 5432,
            unquote(b.path),
        ):
            raise ValueError("Demo target must differ from the source database")
    if database_tables(target):
        raise ValueError(
            "Restore refused: the destination must have no user tables in public"
        )
    manifest = json.loads(
        snapshot.with_suffix(".manifest.json").read_text(encoding="utf-8")
    )
    with snapshot.open("rb") as file:
        if hashlib.file_digest(file, "sha256").hexdigest() != manifest.get("sha256"):
            raise ValueError("Snapshot checksum differs from its private manifest")
    tool = pgtool("pg_restore")
    toc = subprocess.run(
        [tool, "--list", str(snapshot)],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    ).stdout
    # PostgreSQL creates public in a new database; retain it and omit its comment/owner.
    toc = "\n".join(
        line
        for line in toc.splitlines()
        if " SCHEMA - public " not in line and " COMMENT - SCHEMA public " not in line
    )
    with tempfile.TemporaryDirectory(prefix="marcador-restore-") as temp:
        listing = Path(temp) / "restore.list"
        listing.write_text(toc, encoding="utf-8")
        dump_sql = subprocess.run(
            [
                tool,
                "--no-owner",
                "--no-privileges",
                f"--use-list={listing}",
                "--file=-",
                str(snapshot),
            ],
            check=True,
            capture_output=True,
            timeout=180,
        ).stdout
        # pg_dump 17 emits this harmless session setting even for a PG16 source.
        # Removing it permits the tested PG17-client -> PG16-server restore.
        dump_sql = b"".join(
            line
            for line in dump_sql.splitlines(keepends=True)
            if line.strip() != b"SET transaction_timeout = 0;"
        )
        subprocess.run(
            [
                pgtool("psql"),
                "--no-psqlrc",
                "--single-transaction",
                "--set=ON_ERROR_STOP=1",
                "--file=-",
            ],
            input=dump_sql,
            env=connection_env(target),
            check=True,
            capture_output=True,
            timeout=180,
        )
    actual = database_tables(target)
    if actual != manifest["tables"]:
        raise RuntimeError("Restored table counts do not match the snapshot manifest")
    print(
        f"Restore verified: {len(actual)} tables match the private manifest. No provider API was contacted."
    )


def main() -> None:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("export", "restore"))
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    try:
        source = os.environ.get("DATABASE_URL")
        if args.operation == "export":
            if not source:
                raise ValueError("DATABASE_URL is required")
            export(source, args.file)
        else:
            target = os.environ.get("DEMO_DATABASE_URL")
            if not target:
                raise ValueError(
                    "DEMO_DATABASE_URL must point to a separate empty database"
                )
            restore(target, source, args.file)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        # Do not echo the subprocess object or stderr: libpq may include credentials.
        raise SystemExit(
            "PostgreSQL command failed. Check connectivity, TLS and client version; credentials were not logged."
        ) from None
    except psycopg.Error:
        raise SystemExit(
            "Database operation failed. Check connectivity and permissions; credentials were not logged."
        ) from None
    except (ValueError, RuntimeError, OSError) as error:
        raise SystemExit(str(error)) from None


if __name__ == "__main__":
    main()
