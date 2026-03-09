import SocialIcons from "./SocialIcons";

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-title">Una Labs</p>
            <p className="footer-subtitle">Creative AI Studio</p>
            <p className="footer-copy">
              Building real-world AI products across communication, automation, and
              cultural intelligence.
            </p>
            <SocialIcons />
          </div>
          <div className="footer-links">
            <a href="/peacepad">PeacePad</a>
            <a href="/saywetin">SayWetin</a>
            <a href="/blog">Blog</a>
            <a href="/projects">Projects</a>
            <a href="/connect">Connect</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
