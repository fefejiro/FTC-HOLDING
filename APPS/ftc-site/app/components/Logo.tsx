import Image from 'next/image';
export default function Logo() {
  return (
    <Image src="/brand/ftc-logo.png" alt="FTC Logo" width={48} height={48} />
  );
}
