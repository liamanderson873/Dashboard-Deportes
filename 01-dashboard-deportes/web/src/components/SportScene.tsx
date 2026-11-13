/** Quiet field markings; decorative, never substitutes for data or labels. */
export function SportScene({ sport }: { sport: "football" | "nba" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 240"
      className="sport-scene"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {sport === "football" ? (
        <>
          <rect x="15" y="15" width="370" height="210" rx="2" />
          <path d="M200 15v210M15 65h65v110H15m370-110h-65v110h65M15 93h27v54H15m370-54h-27v54h27" />
          <circle cx="200" cy="120" r="38" />
          <circle cx="200" cy="120" r="2" fill="currentColor" />
          <path d="M80 86a42 42 0 0 1 0 68m240-68a42 42 0 0 0 0 68" />
        </>
      ) : (
        <>
          <rect x="15" y="15" width="370" height="210" rx="2" />
          <path d="M200 15v210M15 82h76v76H15m370-76h-76v76h76M29 105v30m342-30v30" />
          <circle cx="200" cy="120" r="30" />
          <circle cx="91" cy="120" r="30" />
          <circle cx="309" cy="120" r="30" />
          <path d="M15 33h31a100 100 0 0 1 0 174H15m370-174h-31a100 100 0 0 0 0 174h31" />
          <circle cx="39" cy="120" r="5" />
          <circle cx="361" cy="120" r="5" />
        </>
      )}
    </svg>
  );
}
