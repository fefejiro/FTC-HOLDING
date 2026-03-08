import Image from "next/image";

export default function Logo() {
  const brandedLogoPath = process.env.NEXT_PUBLIC_UNALABS_LOGO_PATH;
  const logoPath = brandedLogoPath || "/brand/una-mark.svg";
  return <Image src={logoPath} alt="Una Labs mark" width={48} height={48} />;
}
