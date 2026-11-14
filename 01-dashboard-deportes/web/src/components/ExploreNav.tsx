"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@ui-sdk/react/dialog";
import { navigationContext, navigationDestinations } from "@/lib/navigation";

export function ExploreNav({ sport }: { sport: "football" | "nba" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputId = useId();
  const nba = sport === "nba";
  const base = navigationContext(pathname, nba);
  const fold = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const destinations = navigationDestinations(base, nba).filter((item) =>
    fold(`${item.label} ${item.description}`).includes(fold(query)),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-on-ink/30 px-3 text-xs font-semibold text-on-ink hover:bg-on-ink/10 sm:text-sm">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Explorar
      </DialogTrigger>
      <DialogContent
        className="explore-dialog"
        initialFocus={() => document.getElementById(inputId)}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="display text-2xl font-bold">
              Explora {nba ? "la NBA" : "el fútbol"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted">
              Todas las herramientas de esta temporada, en un lugar.
            </DialogDescription>
          </div>
          <DialogClose className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-border-strong px-3 text-sm font-semibold hover:bg-surface-2">
            Cerrar
          </DialogClose>
        </div>
        <div className="my-5">
          <label className="mb-2 block text-sm font-semibold" htmlFor={inputId}>
            Buscar un apartado
          </label>
          <input
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Comparar, playoffs, jugadores…"
            className="min-h-11 w-full rounded-control border border-border-strong bg-card px-3 text-base"
          />
        </div>
        <nav
          aria-label="Todas las herramientas"
          className="min-h-0 overflow-y-auto overscroll-contain"
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {destinations.map((item) => (
              <li key={item.href}>
                <Link
                  prefetch={false}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex h-full min-h-20 flex-col justify-center rounded-control border border-border p-3 hover:border-accent hover:bg-accent-soft"
                >
                  <span className="font-semibold text-accent">
                    {item.label} <span aria-hidden="true">↗</span>
                  </span>
                  <span className="mt-1 text-sm text-muted">
                    {item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!destinations.length && (
            <p className="py-8 text-sm text-muted">
              No hay apartados con ese nombre. Prueba con «jugadores» o
              «partidos».
            </p>
          )}
        </nav>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Puedes cambiar de deporte desde la cabecera. Pulsa Escape para cerrar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
