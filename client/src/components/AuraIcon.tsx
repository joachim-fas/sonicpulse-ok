// Aura-Icon: zwei verschmelzende Kreise (Metaball-Symbol)
export function AuraIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Linker Kreis */}
      <circle cx="9" cy="12" r="6" fill="currentColor" fillOpacity="0.55" />
      {/* Rechter Kreis */}
      <circle cx="15" cy="12" r="6" fill="currentColor" fillOpacity="0.55" />
      {/* Verschmelzungs-Highlight in der Mitte */}
      <ellipse cx="12" cy="12" rx="3" ry="4.5" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}
