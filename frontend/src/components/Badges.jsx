export function PriorityBadge({ priority }) {
  return <span className={`badge priority-${priority}`}>{priority}</span>;
}

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{status.replace("_", " ")}</span>;
}
