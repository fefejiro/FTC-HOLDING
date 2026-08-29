export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'why-delivery-proof-matters-more-than-project-management-software',
    title: 'Why delivery proof matters more than project management software',
    date: '2026-05-04',
    description:
      'Most agencies show you Notion boards and retainers. Una Labs shows you live products. Here is why that difference is the only one that matters when you are choosing a build partner.',
    content: `Project management software is easy to buy. Notion, Linear, Jira, Asana — they all look professional in a sales deck. Every agency has one. None of them prove anything about what actually ships.

Delivery proof is different. It is a live URL, a real user, a working payment flow. It says: we did this before, in public, for a real business, and it is still running today.

## The problem with PM tools as social proof

When an agency shows you a Notion board or a project timeline, they are showing you their internal process — not their output. A well-organised Jira backlog does not tell you whether the product was good, whether it launched, or whether anyone used it.

This is not an accident. Process artefacts are easy to screenshot. Shipped products are harder to fake.

## What shipped products actually tell you

A live product answers questions that no project management tool can:

- Did the team finish the thing?
- Did it hold up under real usage?
- Did it handle edge cases that only appear in production?
- Is it still maintained, or was it abandoned after handoff?

Una Labs ships and maintains products across care, connection, coordination, and opportunity. Their stories focus on the problem, the solution, and what the work taught us.

## The intake flow is the demo

When a prospect visits Una Labs, the intake flow itself is part of the proof. It is not a demo environment or a sandbox — it is the actual system, handling real requests. You see exactly what your clients will see and exactly how the handoff to Stripe works.

This matters because it collapses the gap between "what the agency promised" and "what the client gets." There is no presentation layer hiding the real system.

## What this means when you are choosing a build partner

Ask any agency you are evaluating to show you something live that they built and still own. Not a case study PDF. Not a Figma file. A working URL, in production, with real data flowing through it.

If they cannot show you that, they are selling you process. Una Labs sells proof.

The delivery standard is the same whether you are building a roadside assistance platform or an AI co-parenting tool. The bar is: it ships, it runs, and it earns trust with real users — not just on a slide.`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
