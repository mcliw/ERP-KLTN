import "../styles/quickAction.css";

export default function QuickAction({ label, icon, onClick }) {
  return (
    <button className="quick-action-btn" onClick={onClick}>
      {icon && <span className="quick-action-icon">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}