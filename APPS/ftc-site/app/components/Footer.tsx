export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ color: "var(--muted)" }}>
            (c) 2026 FTC. Intelligent software, creative AI, real-world systems.
          </div>
          <div className="footer-links">
            <a href="/capabilities">Capabilities</a>
            <a href="/work">Work</a>
            <a href="/products">Products</a>
            <a href="/work-with-ftc">Work With FTC</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

