# Brand Media Integration Handover

Date: 2026-03-10
Project: `APPS/ftc-site`
Canonical repo root: `C:\FTC HOLDING`

## 1. Summary of Changes

This pass upgraded the Una Labs site visually using the approved brand media library while preserving the existing routing, metadata, SEO structure, and content architecture.

Primary improvements:
- upgraded the homepage hero with a premium flagship image treatment
- added a studio-for-builders section using the builder workspace artwork
- added a product ecosystem section showing how PeacePad, SayWetin, and ATEAM relate
- added a premium PeacePad concept visual near the top of the PeacePad page
- added a contained ambient SayWetin showcase video near the top of the SayWetin page
- added reusable media components for image and video treatments

## 2. Exact Media Filenames Used

Used:
- `unalabs-hero.PNG`
- `unalabs-builder-workspace.PNG`
- `unalabs-ecosystem.PNG`
- `peacepad-showcase.PNG`
- `saywetin-showcase.mp4`

Not used:
- `unalabs-hero.mp4`

## 3. Where Each Media Asset Was Placed

### `unalabs-hero.PNG`
- Homepage hero in `app/components/Hero.tsx`

### `unalabs-builder-workspace.PNG`
- Homepage studio-for-builders section in `app/page.tsx`

### `unalabs-ecosystem.PNG`
- Homepage product ecosystem section in `app/page.tsx`
- Products page top ecosystem banner in `app/products/page.tsx`

### `peacepad-showcase.PNG`
- PeacePad page top overview support block in `app/peacepad/page.tsx`

### `saywetin-showcase.mp4`
- SayWetin page top contained media card in `app/saywetin/page.tsx`

## 4. Any Media Not Used and Why

### `unalabs-hero.mp4`
Not used in this pass.

Reason:
- the homepage hero already uses the flagship PNG effectively
- the MP4 is large enough that using it in the hero would create more performance and readability risk
- keeping the hero static preserves a calmer, more premium impression while still using motion selectively on the SayWetin page where it adds more value

## 5. Components Created or Modified

### Created
- `app/components/BrandImagePanel.tsx`
- `app/components/BrandVideoPanel.tsx`

### Modified
- `app/components/Hero.tsx`
- `app/page.tsx`
- `app/products/page.tsx`
- `app/peacepad/page.tsx`
- `app/saywetin/page.tsx`
- `styles/globals.css`

## 6. Performance Precautions Taken

- PNG media is rendered through `next/image`
- hero image only is treated as priority; non-critical images remain normal/lazy
- MP4 usage is limited to one contained card on the SayWetin page
- video is muted, looped, plays inline, and uses `preload="metadata"`
- no full-screen or intrusive autoplay background video was added
- existing route architecture and static metadata were left intact
- no media was dumped across unrelated routes

## 7. SEO Confirmation Checklist

Confirmed in code intent for this pass:
- no route names changed
- no blog route changes
- no metadataBase changes
- no canonical URL changes
- no robots changes
- no sitemap changes
- no Open Graph or Twitter metadata changes
- no JSON-LD organization changes
- no removal of existing content hierarchy or H1 structure

## 8. Follow-Up Recommendations

1. If the hero MP4 is later tested, keep it as an optional contained enhancement rather than a mandatory full-background autoplay experience.
2. Consider adding optimized poster images or compressed derivatives if more video is introduced later.
3. If the products hub evolves, the ecosystem section can become a reusable cross-product narrative component.
4. Keep future media passes disciplined: each media block should support narrative, not just decoration.
