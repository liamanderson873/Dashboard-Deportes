"use client";

import Image from "next/image";
import { useState } from "react";
import logos from "@/lib/team-logos.json";

type Logo = { src: string; source: string };
const football = logos.football as Record<string, Logo>;
const nba = logos.nba as Record<string, Logo>;
const localFootball = new Map(
  Object.values(football).map((logo) => [logo.source, logo.src]),
);

/** Decorative beside the visible team name. Fixed bounds prevent layout shifts. */
export function TeamCrest({
  crest,
  tla,
  size,
}: {
  crest: string | null;
  tla: string | null;
  size: number;
}) {
  const src = crest ? (localFootball.get(crest) ?? crest) : null;
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      aria-hidden="true"
      className={`team-logo ${src && failed !== src ? "team-logo-image" : "team-logo-fallback"}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.28)),
      }}
    >
      {src && failed !== src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailed(src)}
        />
      ) : (
        (tla ?? "")
      )}
    </span>
  );
}

export function NbaTeamLogo({
  id,
  abbreviation = "NBA",
  size = 36,
}: {
  id?: number;
  abbreviation?: string;
  size?: number;
}) {
  return (
    <TeamCrest
      crest={id ? (nba[String(id)]?.src ?? null) : null}
      tla={abbreviation}
      size={size}
    />
  );
}

export function FootballTeamLogo({
  id,
  name,
  size = 28,
}: {
  id: number | null;
  name: string;
  size?: number;
}) {
  return (
    <TeamCrest
      crest={id ? (football[String(id)]?.src ?? null) : null}
      tla={name
        .split(/\s+/)
        .map((s) => s[0])
        .join("")
        .slice(0, 3)}
      size={size}
    />
  );
}
