import Link from 'next/link';

export default function OverviewCards() {
  const cards = [
    { title: 'Enterprise Systems & Infrastructure', href: '/services/enterprise-systems-infrastructure' },
    { title: 'Intelligent Systems Automation', href: '/services/intelligent-systems-automation' },
    { title: 'Product & Technical Architecture', href: '/services/product-technical-architecture' },
  ];
  return (
    <div className="overview-cards">
      {cards.map(c => (
        <Link key={c.href} href={c.href} className="card">
          {c.title}
        </Link>
      ))}
    </div>
  );
}
