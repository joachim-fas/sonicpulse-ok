// Grain/Halftone Icon für den Theme-Toggle
// Zeigt ein organisches Blob mit Halftone-Punkten – erkennbares Symbol für das Grain-Theme
export function GrainIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Organischer Blob-Umriss */}
      <path
        d="M12 3C8.5 3 5 6 5 10C5 14 7 17 10 18.5C11 19 12 19.5 12 21C12 19.5 13 19 14 18.5C17 17 19 14 19 10C19 6 15.5 3 12 3Z"
        fill="currentColor"
        opacity="0.15"
      />
      {/* Halftone-Punkte im Blob */}
      <circle cx="10" cy="9" r="1.2" fill="currentColor" opacity="0.9" />
      <circle cx="13" cy="8" r="1.4" fill="currentColor" opacity="0.9" />
      <circle cx="15" cy="11" r="1.0" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="9" cy="13" r="0.9" fill="currentColor" opacity="0.6" />
      <circle cx="13" cy="14" r="1.1" fill="currentColor" opacity="0.75" />
      <circle cx="12" cy="10" r="0.8" fill="currentColor" opacity="0.5" />
      {/* Kleiner Akzent-Kreis unten (wie in Bild 2) */}
      <circle cx="9" cy="17" r="1.3" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
