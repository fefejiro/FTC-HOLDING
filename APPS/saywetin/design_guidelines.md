# Saywetin Design Guidelines

## Brand Identity

**Name:** Saywetin (Nigerian Pidgin for "What are you saying?")
**Tagline:** Discover the Meaning Behind African Music
**Style:** Minimal, bold, Afrobeat-inspired, urban-cool

## Color Palette

### Primary Colors
- **Vibrant Green:** `#00C853` / HSL: `148 100% 39%` - Primary brand color, Naija flag inspired
- **Deep Black/Charcoal:** `#121212` - Sophistication and contrast
- **Pure White:** `#FFFFFF` - Clean backgrounds

### Accent Colors
- **Yellow Gold:** `#FFD600` / HSL: `50 100% 50%` - Energy and warmth (optional accent)
- **Sunset Orange:** `#FF6B35` - Afrobeat energy
- **Sunset Red:** `#E53935` - Warmth and passion

### Semantic Colors
- **Success:** Green (primary)
- **Error/Destructive:** `#D32F2F`
- **Warning:** `#FFA726`
- **Info:** `#29B6F6`

## Typography

### Font Families
- **Headings/UI:** Inter (or Poppins/Montserrat) - Modern, rounded, sleek
- **Lyric Content:** Georgia/Merriweather - Elegant, readable for lyrics
- **Monospace:** Menlo - Code/technical content

### Hierarchy
- Page titles: 32-40px (bold)
- Song titles: 24-28px (semibold)
- Lyric lines: 18-20px (regular, generous line-height 1.8)
- Translations: 16px (regular)
- Metadata/labels: 14px (medium)

## Layout System

**Spacing Units:** Use Tailwind units of **4, 6, 8, 12, 16** (e.g., p-4, gap-6, my-8, py-12, space-y-16)

**Container Widths:**
- Full-width sections: `w-full` with inner `max-w-7xl mx-auto px-6`
- Song cards grid: `max-w-6xl`
- Lyric content: `max-w-4xl` (optimal reading width)

**Grid Systems:**
- Desktop: 4 columns for song cards (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- Tablet: 2 columns
- Mobile: 1 column

## Components

### Buttons
- Primary: Vibrant green background with white text
- Secondary: Subtle gray background
- Ghost: Transparent with hover effect
- Destructive: Red for dangerous actions

### Cards
- Subtle border with rounded corners (rounded-md)
- Light shadow in light mode
- Background slightly elevated from page background

### Badges
- Small, pill-shaped indicators
- Use for language tags, status, slang terms
- Secondary variant for subtle labels

## Logo Usage

The Saywetin logo features:
- Stylized "S" incorporating sound wave elements
- Vibrant green (#00C853) as the primary color
- Clean, minimal design that works at all sizes
- Used in header, app icon, and marketing materials

## Cultural Elements

The design should feel:
- **Vibrant:** African-inspired energy
- **Modern:** Clean, contemporary UI
- **Confident:** Bold typography and colors
- **Playful:** Engaging interactions
- **Culturally rooted:** Respectful representation

## Dark Mode

Dark mode uses:
- Deep charcoal background (#0A0A0A)
- White/light gray text
- Same primary green (#00C853) - maintains brand identity
- Elevated surfaces slightly lighter than background

## Iconography

- Use Lucide React icons consistently
- Icons should be 4x4 (16px) for inline, 5x5 (20px) for buttons
- Use primary color for active/important icons
- Use muted-foreground for secondary icons

## Design Reference

**Inspiration Sources:**
- **Spotify**: Card-based browsing, music metadata presentation
- **Genius**: Lyric line interaction, annotation patterns
- **Duolingo**: Language learning UX, translation displays
