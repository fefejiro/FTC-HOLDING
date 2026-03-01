import Dashboard from "@/components/Dashboard";
import { SEOHead } from "@/components/SEOHead";

export default function DashboardPage() {
  return (
    <>
      <SEOHead title="Dashboard" description="Your co-parenting dashboard" noindex />
      <Dashboard />
    </>
  );
}
