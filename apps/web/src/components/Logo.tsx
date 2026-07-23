export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`logo ${compact ? "logo--compact" : ""}`} aria-label="Aura e Ego">
    <span>AURA</span><i>&</i><span>EGO</span>
  </div>;
}
