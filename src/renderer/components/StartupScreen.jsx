import BrandMark from "./BrandMark";

export default function StartupScreen({ label = "Opening your community…" }) {
  return (
    <main className="startup-screen" role="status" aria-live="polite">
      <div className="startup-grid" aria-hidden="true" />
      <div className="startup-glow startup-glow-one" aria-hidden="true" />
      <div className="startup-glow startup-glow-two" aria-hidden="true" />
      <section className="startup-card">
        <div className="startup-mark" aria-hidden="true">
          <i className="startup-ring startup-ring-one" />
          <i className="startup-ring startup-ring-two" />
          <i className="startup-node startup-node-one" />
          <i className="startup-node startup-node-two" />
          <i className="startup-node startup-node-three" />
          <span>
            <BrandMark />
          </span>
        </div>
        <div className="startup-copy">
          <span className="eyebrow">CrewDeck</span>
          <h1>Bringing your crew together</h1>
          <p>{label}</p>
        </div>
        <div className="startup-progress" aria-hidden="true">
          <i />
        </div>
        <div className="startup-checks" aria-hidden="true">
          <span>
            <i /> Secure session
          </span>
          <span>
            <i /> Community sync
          </span>
          <span>
            <i /> Ready
          </span>
        </div>
      </section>
    </main>
  );
}
