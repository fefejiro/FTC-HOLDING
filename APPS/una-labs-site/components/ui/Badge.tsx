interface BadgeProps {
  variant?: 'teal' | 'orange' | 'muted';
  children: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  teal: 'bg-brand-teal-light text-brand-teal',
  orange: 'bg-brand-orange-light text-brand-orange',
  muted: 'bg-bg-subtle text-tx-muted',
};

export function Badge({ variant = 'teal', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-block text-eyebrow uppercase tracking-widest px-3 py-1 rounded-full',
        VARIANTS[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
