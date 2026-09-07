import Image from 'next/image';

type ProductMarkProps = {
  name: string;
  icon: string;
  size?: 'sm' | 'lg';
};

const PRODUCT_LOGOS: Record<string, { src: string; alt: string }> = {
  peacepad: { src: '/brand/products/peacepad-icon.png', alt: 'PeacePad app icon' },
  saywetin: { src: '/brand/products/saywetin-logo.png', alt: 'SayWetin app icon' },
  dispatch: { src: '/brand/products/dispatch-icon.svg', alt: 'Dispatch app icon' },
};

export function ProductMark({ name, icon, size = 'sm' }: ProductMarkProps) {
  const logo = PRODUCT_LOGOS[name.toLowerCase().replace(/[^a-z]/g, '')];
  const large = size === 'lg';
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-teal-light text-brand-teal ${large ? 'h-[72px] w-[72px]' : 'h-[52px] w-[52px]'}`}>
      {logo ? (
        <Image src={logo.src} alt={logo.alt} width={large ? 72 : 52} height={large ? 72 : 52} className="h-full w-full object-cover" />
      ) : (
        <span className={large ? 'text-2xl font-semibold' : 'text-xl font-semibold'} aria-label={`${name} mark`}>{icon}</span>
      )}
    </span>
  );
}
