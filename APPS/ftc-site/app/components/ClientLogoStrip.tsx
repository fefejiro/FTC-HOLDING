import Image from "next/image";

const clientLogos = [
  {
    name: "LCBO",
    alt: "LCBO client logo",
    src: "/images/clients/lcbo-logo-1097364160.jpg"
  },
  {
    name: "Canadian Tire",
    alt: "Canadian Tire client logo",
    src: "/images/clients/Canadian Tire Logo .jpg"
  },
  {
    name: "Home Depot",
    alt: "Home Depot client logo",
    src: "/images/clients/The_Home_Depot-Logo .png"
  },
  {
    name: "Ontario Government",
    alt: "Ontario Government client logo",
    src: "/images/clients/Ontario Government Logo.png"
  }
] as const;

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
                width={220}
                height={88}
                sizes="(max-width: 640px) 44vw, (max-width: 980px) 28vw, 220px"
                className="client-logo-image"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
