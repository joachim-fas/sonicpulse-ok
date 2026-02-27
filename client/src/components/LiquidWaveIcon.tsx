// Simple wave/orb icon for the Liquid Orb theme toggle button
export function LiquidWaveIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Inner organic blob */}
      <path
        d="M12 5 C15 5, 18 8, 17 12 C16 16, 13 18, 10 17 C7 16, 5 13, 6 10 C7 7, 9 5, 12 5 Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
      {/* Highlight */}
      <circle cx="9.5" cy="8.5" r="1.5" fill="currentColor" fillOpacity="0.8" />
    </svg>
  );
}
