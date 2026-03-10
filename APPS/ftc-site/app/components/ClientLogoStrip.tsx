import Image from "next/image";
import { clientLogos } from "../../lib/clientLogos";

export default function ClientLogoStrip() {
  return (
    <section className="section fade-on-scroll client-logo-section" aria-labelledby="selected-clients-heading">
      <div className="container client-logo-shell">
        <div className="client-logo-copy">
          <p className="eyebrow">Selected clients</p>
          <h2 id="selected-clients-heading">Selected clients</h2>
          <p>FTC has delivered consulting and technology work for organizations including:</p>
        </div>

        <div className="client-logo-grid" role="list" aria-label="Selected clients">
          {clientLogos.map((logo) => (
            <div key={logo.name} className="client-logo-card" role="listitem" aria-label={logo.name}>
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                sizes="(max-width: 640px) 72vw, (max-width: 980px) 40vw, 220px"
                className="client-logo-image"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
