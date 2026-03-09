export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ color: "var(--muted)" }}>
            (c) 2026 Una Labs. Intelligent software, creative AI, real-world systems.
            <br />
            Una Labs is the technology studio of Fejiro Technology Consultancy Inc.
          </div>
          <div className="footer-links">
            <a href="/capabilities">Studio</a>
            <a href="/work">Work</a>
            <a href="/projects">Projects</a>
            <a href="/blog">Blog</a>
            <a href="/peacepad">AI communication platform</a>
            <a href="/saywetin">Nigerian music AI</a>
            <a href="/about">About</a>
            <a href="/work-with-ftc">Start a Project</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
