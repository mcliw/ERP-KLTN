import "../styles/statCard.css";

export default function StatCard({ title, value, note }) {
  return (
    <div className="stat-card">
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__title">{title}</div>
      {note && <div className="stat-card__note">{note}</div>}
    </div>
  );
}