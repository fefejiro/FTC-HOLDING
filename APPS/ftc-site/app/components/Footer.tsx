export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div style={{color:'var(--muted)'}}>© 2026 Fejiro Technology Consultancy Inc.</div>
          <div className="footer-links">
            <a href="https://linkedin.com/in/fejiro-efiuvwere" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://peacepad.ca/" target="_blank" rel="noopener noreferrer">PeacePad</a>
            <a href="https://saywetin.app/" target="_blank" rel="noopener noreferrer">SayWetin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
