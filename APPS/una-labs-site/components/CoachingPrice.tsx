'use client';

import { useEffect, useState } from 'react';
import { getStripeApiUrl } from '@/lib/stripe-config';

type CoachingPriceProps = {
  prefix?: string;
  suffix?: string;
  className?: string;
};

export function CoachingPrice({ prefix = '', suffix = '', className }: CoachingPriceProps) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(getStripeApiUrl('/api/coaching/config'))
      .then((response) => (response.ok ? response.json() as Promise<{ price_cad?: number }> : null))
      .then((result) => {
        if (active && result && typeof result.price_cad === 'number') setPrice(result.price_cad);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return <span className={className}>{prefix}{price === null ? 'CAD price' : `CAD $${price}`}{suffix}</span>;
}
