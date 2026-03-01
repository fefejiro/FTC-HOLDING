# PeacePad Design Guidelines

## Design Approach: Reference-Based (Clear Communication)

**Primary References:** Linear (clean interface architecture) + Headspace (calming aesthetics) + Notion (organized information hierarchy)

**Core Principle:** Create a sanctuary for difficult conversations—every visual element should reduce tension, not amplify it.

---

## Color Palette

**Light Mode:**
- Primary: 210 35% 45% (calming slate blue)
- Background: 210 20% 98% (soft off-white)
- Surface: 0 0% 100% (pure white cards)
- Text Primary: 215 25% 20% (soft charcoal)
- Text Secondary: 215 15% 50% (muted gray)
- Success (Calm Tone): 145 40% 45% (sage green)
- Warning (Tension): 35 85% 55% (warm amber)
- Danger (Conflict): 355 70% 50% (soft coral, not aggressive red)

**Dark Mode:**
- Primary: 210 40% 60% (lighter slate for contrast)
- Background: 220 20% 12% (deep slate)
- Surface: 220 15% 18% (elevated cards)
- Text Primary: 210 15% 92%
- Text Secondary: 210 10% 65%

**AI Tone Indicators:**
- Calm: 145 40% 45% (sage green)
- Cooperative: 200 45% 50% (peaceful teal)
- Neutral: 210 20% 60% (balanced gray-blue)
- Frustrated: 35 70% 55% (gentle amber)
- Defensive: 355 60% 55% (soft coral)

---

## Typography

**Fonts:**
- Primary: Inter (via Google Fonts) - clean, professional, highly legible
- Mono: JetBrains Mono - for timestamps and metadata

**Hierarchy:**
- Hero/Landing: text-4xl to text-6xl, font-semibold
- Page Titles: text-2xl to text-3xl, font-semibold
- Section Headers: text-xl, font-medium
- Body Text: text-base, font-normal, leading-relaxed
- Chat Messages: text-base, leading-relaxed (generous line height for readability)
- AI Summaries: text-sm, font-medium, italic
- Timestamps: text-xs, font-mono, text-secondary

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, m-4, gap-6, etc.)

**Container Strategy:**
- App Shell: Full viewport with max-w-7xl centered
- Chat Interface: max-w-4xl for comfortable reading width
- Dashboard: Grid layouts with gap-6 to gap-8
- Message Bubbles: px-4 py-3, adequate padding for touch

**Responsive Breakpoints:**
- Mobile First: Single column, stacked navigation
- md: 768px+ Two-column dashboard, side navigation
- lg: 1024px+ Full three-column layout (nav + chat + info panel)

---

## Component Library

**Navigation:**
- Clean top bar with logo + user profile (not sidebar on mobile)
- Persistent bottom nav on mobile: Chat / Dashboard / Settings
- Desktop: Left sidebar (240px) with icon + label navigation
- Subtle dividers (opacity-10) between sections

**Chat Interface:**
- Message bubbles: Rounded-2xl, generous padding
- Current user: Align right, primary color background, white text
- Co-parent: Align left, surface background, text-primary
- AI Tone Pills: Small rounded-full badges below messages with icon + text
- Input: Sticky bottom, rounded-xl, shadow-lg, with send button inside

**AI Mediator Display:**
- Floating card between messages when tone analysis triggers
- Subtle gradient background from tone color (opacity-5 to opacity-10)
- Icon (mood indicator) + Summary text + Optional suggestion
- Dismissible with small X button

**Dashboard Widgets:**
- Card-based: Rounded-xl, p-6, shadow-sm
- Notes: Sticky-note aesthetic with subtle yellow tint (45 95% 95%)
- Tasks: Checkbox list with hover states
- Child Updates: Timeline view with connector lines
- All interactive elements: hover:shadow-md transition

**Forms & Inputs:**
- Rounded-lg inputs with border-2 focus states
- Primary color focus ring (ring-2 ring-offset-2)
- Clear labels above inputs (text-sm font-medium)
- Helper text below (text-xs text-secondary)

---

## Unique Features Design

**Tone Analysis Visualization:**
- Real-time pill that appears 2s after message sent
- Pulsing animation on first appearance (animate-pulse once)
- Color-coded border-l-4 stripe matching tone
- Expandable: Click to see detailed analysis

**Mood Trends (Future):**
- Line chart with gradient fill beneath
- Week/Month/Year toggles
- Hover tooltips with specific dates
- Color gradient from calm (green) to tense (amber)

**Suggested Phrasing Feature:**
- Appears as floating suggestion card when tension detected
- "Try saying..." header
- Alternative phrasing in chat bubble preview
- One-click to replace or dismiss

---

## Interaction & Animation

**Micro-interactions (Minimal Use):**
- Message send: Subtle slide-up animation
- Tone pill appearance: Fade-in with slight scale
- Card hover: Gentle shadow increase (transition-shadow duration-200)
- NO complex scroll animations or page transitions

**Loading States:**
- Skeleton screens for chat history (pulsing gray blocks)
- Spinner for AI analysis (calm rotation, primary color)
- Progressive message loading (fade-in as they load)

---

## Accessibility & Emotional Safety

- High contrast ratios: AA standard minimum (4.5:1 for body text)
- Keyboard navigation for all interactive elements
- Focus indicators always visible (never outline-none)
- Screen reader announcements for AI tone changes
- Option to disable tone analysis (privacy toggle)
- Color-blind safe palette with pattern/icon redundancy

---

## Images

**Landing Page Hero:**
- Large hero image (60vh on desktop): Diverse family or peaceful co-parenting moment
- Style: Warm, natural photography with soft focus background
- Overlay: Subtle gradient (primary color opacity-30) for text legibility
- CTA buttons on blurred background (backdrop-blur-md bg-white/10)

**Dashboard:**
- Empty state illustrations: Friendly, hand-drawn style (undraw.co aesthetic)
- Profile avatars: Rounded-full, border-2 with primary color
- No images in chat area (focus on communication)

---

## Marketing Pages (Future Expansion)

**Landing Page Structure:**
1. Hero: Full-width image with centered headline + subtitle + dual CTAs
2. Problem Statement: Two-column (text + image) explaining co-parenting challenges
3. AI Feature Showcase: Three-column grid with icons + descriptions
4. How It Works: Stepped process with numbers + visuals
5. Testimonials: Two-column cards with parent quotes
6. Pricing: Center-aligned cards (Free / Pro tiers)
7. Final CTA: Bold section with primary color background
8. Footer: Multi-column (Product, Resources, Company, Social)

**Color Strategy for Marketing:**
- Use primary blue more boldly on landing (60% saturation vs 35% in app)
- Accent with success green for positive outcomes
- Generous whitespace (py-20 to py-32 between sections)
- Image-text rhythm: Alternate sides for visual flow