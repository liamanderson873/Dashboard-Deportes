"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import type { Player, PlayerTeam } from "@/lib/player-analytics";
import { searchPlayers } from "@/lib/player-browsing";
import { pe, positionLabel } from "@/lib/players-es";

export function PlayerPicker({
  label,
  players,
  teams,
  value,
  onChange,
  formatPosition = positionLabel,
}: {
  label: string;
  players: Player[];
  teams: PlayerTeam[];
  value: string;
  onChange: (id: string) => void;
  formatPosition?: (position: string | null) => string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = players.find((player) => String(player.id) === value);
  const matches = searchPlayers(players, query);
  const visible = matches.slice(0, 30);
  const highlighted = Math.min(active, visible.length - 1);
  useEffect(() => {
    if (open && highlighted >= 0)
      document
        .getElementById(`${id}-option-${highlighted}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted, id]);

  function choose(player: Player) {
    onChange(String(player.id));
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(
        open
          ? Math.max(
              0,
              Math.min(
                visible.length - 1,
                highlighted + (event.key === "ArrowDown" ? 1 : -1),
              ),
            )
          : 0,
      );
    } else if (event.key === "Enter" && open && visible[highlighted]) {
      event.preventDefault();
      choose(visible[highlighted]);
    }
  }

  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="eyebrow mb-1.5 block">
        {label}
      </label>
      <div className="flex rounded-control border border-border-strong bg-card focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-control bg-transparent px-3 py-2 text-base text-fg sm:text-sm"
          placeholder={pe.searchByName}
          value={open ? query : (selected?.name ?? "")}
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && highlighted >= 0 ? `${id}-option-${highlighted}` : undefined
          }
          onFocus={() => {
            setQuery("");
            setActive(0);
            setOpen(true);
          }}
          onClick={() => {
            if (!open) {
              setQuery("");
              setActive(0);
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {value && (
          <button
            type="button"
            className="min-h-11 min-w-11 px-3 text-muted hover:text-fg"
            aria-label={`${pe.clearPlayer}: ${label}`}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-control border border-border-strong bg-card shadow-lg">
          <p
            role="status"
            className="border-b border-border px-3 py-2 text-xs text-subtle"
          >
            {matches.length
              ? pe.searchCount(matches.length, visible.length)
              : pe.noPlayerMatches}
          </p>
          <ul
            id={`${id}-options`}
            role="listbox"
            aria-label={label}
            className="max-h-72 overflow-y-auto py-1"
          >
            {visible.map((player, index) => (
              <li
                key={player.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={String(player.id) === value}
                className={`cursor-pointer px-3 py-2 text-sm ${index === highlighted ? "bg-accent-soft" : "hover:bg-surface-2"}`}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(player)}
              >
                <span className="block font-semibold">{player.name}</span>
                <span className="block text-xs text-muted">
                  {formatPosition(player.position)} ·{" "}
                  {player.teamIds
                    .map((id) => teams.find((team) => team.id === id)?.name)
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
