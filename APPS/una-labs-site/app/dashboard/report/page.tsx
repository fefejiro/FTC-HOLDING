import type { Metadata } from 'next';
import { ReportClient } from '@/app/dashboard/report/ReportClient';

export const metadata: Metadata = {
  title: 'Project Report',
  description: 'Your Una Labs project report and milestone summary.',
};

export default function ReportPage() {
  return <ReportClient />;
}