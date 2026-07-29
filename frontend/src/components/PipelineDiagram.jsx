// Small always-visible diagram in the sidebar that names the exact
// architecture this project demonstrates — useful when explaining the
// system to faculty without needing a separate whiteboard.
export default function PipelineDiagram() {
  const steps = [
    "New ticket \u2192 PostgreSQL",
    "\u2193",
    "Conversation \u2192 MongoDB",
    "\u2193",
    "Job queued \u2192 Redis",
    "\u2193",
    "AI classifies + drafts reply",
  ];

  return (
    <div className="pipeline">
      <div className="pipeline-label">Data pipeline</div>
      <div className="pipeline-flow">
        {steps.map((step, i) =>
          step === "\u2193" ? (
            <div className="pipeline-node connector" key={i}>
              {step}
            </div>
          ) : (
            <div className="pipeline-node" key={i}>
              <span className="pipeline-dot" />
              {step}
            </div>
          )
        )}
      </div>
    </div>
  );
}
