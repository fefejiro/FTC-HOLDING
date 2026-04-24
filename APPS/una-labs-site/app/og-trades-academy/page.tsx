import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'OG Trades Academy — Practical Trades Training in Canada',
  description:
    'OG Trades Academy is a pre-launch Canadian trade school offering hands-on training in electrical, plumbing, HVAC, and carpentry. Enrollment opening soon.',
  path: '/og-trades-academy',
});

export default function OGTradesAcademyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 py-20 px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-600 mb-4">
          Coming Soon
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          OG Trades Academy
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          A practical trade school for the next generation of skilled workers. Hands-on
          training, industry mentors, and a direct path to employment — built for Ottawa
          and beyond.
        </p>
      </section>

      {/* About */}
      <section className="py-16 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About the Academy</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          OG Trades Academy is a pre-launch initiative focused on closing the skilled trades
          gap in Canada. We are building a curriculum that combines classroom theory with
          real-world job site experience — covering electrical, plumbing, HVAC, and
          carpentry tracks.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Our domain is secured, partnerships are in progress, and enrollment opens soon.
          Leave your email below to be first on the list.
        </p>
      </section>

      {/* Founder / Owner photo placeholder */}
      <section className="py-10 px-6 max-w-3xl mx-auto border-t border-gray-100">
        <div className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="w-28 h-28 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shrink-0 overflow-hidden">
            {/* Replace src with actual owner photo when available */}
            <span className="text-amber-400 text-4xl select-none">👷</span>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Founder</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fejiro Onobrunu</h3>
            <p className="text-gray-600 leading-relaxed">
              Founder of FTC Holding and Una Labs. Building OG Trades Academy to give
              skilled tradespeople the same quality of training resources available to
              knowledge workers — structured, practical, and employer-connected.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-amber-50 mt-10">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Notified at Launch</h2>
          <p className="text-gray-600 mb-8">
            Enrollment opens soon. Be first in line — no spam, one email when we go live.
          </p>
          <a
            href="mailto:hello@ogtradesacademy.ca?subject=OG%20Trades%20Academy%20Early%20Access&body=I%20would%20like%20to%20be%20notified%20when%20OG%20Trades%20Academy%20launches."
            className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors"
          >
            Request Early Access
          </a>
          <p className="mt-6 text-sm text-gray-500">
            Questions?{' '}
            <Link href="/contact" className="text-amber-600 hover:underline">
              Contact us
            </Link>{' '}
            or visit{' '}
            <a
              href="https://ogtradesacademy.ca"
              className="text-amber-600 hover:underline"
              rel="noopener noreferrer"
            >
              ogtradesacademy.ca
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
