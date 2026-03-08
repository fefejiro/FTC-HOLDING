import Image from "next/image";

export default function Logo() {
  const brandedLogoPath = process.env.NEXT_PUBLIC_UNALABS_LOGO_PATH;
  if (brandedLogoPath) {
    return <Image src={brandedLogoPath} alt="Una Labs mark" width={48} height={48} />;
  }

  if (process.env.NEXT_PUBLIC_USE_LEGACY_LOGO === "1") {
    return <Image src="/brand/ftc-logo.png" alt="Una Labs mark" width={48} height={48} />;
  }

  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img">
        <title>Una Labs mark</title>
        <g transform="translate(32 32)">
          <ellipse cx="0" cy="-17" rx="8.8" ry="15.2" fill="#20b6ab" />
          <ellipse
            cx="14.7"
            cy="-8.5"
            rx="8.8"
            ry="15.2"
            fill="#f4b428"
            transform="rotate(60)"
          />
          <ellipse
            cx="14.7"
            cy="8.5"
            rx="8.8"
            ry="15.2"
            fill="#ef5643"
            transform="rotate(120)"
          />
          <ellipse cx="0" cy="17" rx="8.8" ry="15.2" fill="#374861" />
          <ellipse
            cx="-14.7"
            cy="8.5"
            rx="8.8"
            ry="15.2"
            fill="#2fd4bf"
            transform="rotate(240)"
          />
          <ellipse
            cx="-14.7"
            cy="-8.5"
            rx="8.8"
            ry="15.2"
            fill="#f7c145"
            transform="rotate(300)"
          />
          <circle cx="0" cy="0" r="3.7" fill="#f9fafb" />
        </g>
      </svg>
    </span>
  );
}
