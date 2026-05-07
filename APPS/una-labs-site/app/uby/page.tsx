import type { Metadata } from 'next';
import { UbyPortalClient } from './UbyPortalClient';

export const metadata: Metadata = {
  title: 'UBY Portal - Una Labs',
  robots: 'noindex, nofollow',
};

export default function UbyPortalPage() {
  return <UbyPortalClient />;
}
