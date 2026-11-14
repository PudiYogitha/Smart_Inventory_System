export default function StatCard({ label, value, note, icon, alert = false }) {
  return (
    <article className={`stat-card${alert ? " stat-alert" : ""}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <span className="stat-note">{note}</span>
      <span className="stat-icon">{icon}</span>
    </article>
  );
}
