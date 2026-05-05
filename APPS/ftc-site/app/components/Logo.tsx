import Image from "next/image";

export default function Logo() {
  const brandedLogoPath = process.env.NEXT_PUBLIC_UNALABS_LOGO_PATH;
  const logoPath = brandedLogoPath || "/brand/una-mark.svg";
  return (
    <span className="logo-mark" aria-hidden="true">
      <Image src={logoPath} alt="Una Labs mark" width={48} height={48} priority />
    </span>
  );
}
