# Brand Media Integration Handover

Date: 2026-03-10
Project: `APPS/ftc-site`
Canonical repo root: `C:\FTC HOLDING`

## 1. Summary of Changes

This pass upgraded the Una Labs site visually using the approved brand media library while preserving the existing routing, metadata, SEO structure, and content architecture.

Primary improvements:
- upgraded the homepage hero with a premium flagship video treatment using the PNG as fallback poster
- added a studio-for-builders section using the builder workspace artwork
- added a product ecosystem section showing how PeacePad, SayWetin, and ATEAM relate
- added a PeacePad top-of-page product demo section plus a support concept visual
- added a contained SayWetin product demo section near the top of the SayWetin page
- tightened the `/connect` page into a denser desktop grid and centered the QR section for easier scanning
- added reusable media components for image and video treatments

## 2. Exact Media Filenames Used

Used:
- `unalabs-hero.PNG`
- `unalabs-hero.mp4`
- `unalabs-builder-workspace.PNG`
- `unalabs-ecosystem.PNG`
- `peacepad-showcase.PNG`
- `saywetin-showcase.mp4`

## 3. Where Each Media Asset Was Placed

### `unalabs-hero.PNG`
- Homepage hero as poster fallback in `app/components/Hero.tsx`

### `unalabs-hero.mp4`
- Homepage hero flagship reel in `app/components/Hero.tsx`
- PeacePad product demo section in `app/peacepad/page.tsx`

### `unalabs-builder-workspace.PNG`
- Homepage studio-for-builders section in `app/page.tsx`

### `unalabs-ecosystem.PNG`
- Homepage product ecosystem section in `app/page.tsx`
- Products page top ecosystem banner in `app/products/page.tsx`

### `peacepad-showcase.PNG`
- PeacePad page top support visual below the demo section in `app/peacepad/page.tsx`

### `saywetin-showcase.mp4`
- SayWetin page top product demo card in `app/saywetin/page.tsx`

## 4. Any Media Not Used and Why

All approved assets are now integrated.

## 5. Components Created or Modified

### Created
- `app/components/BrandImagePanel.tsx`
- `app/components/BrandVideoPanel.tsx`

### Modified
- `app/components/Hero.tsx`
- `app/page.tsx`
- `app/connect/page.tsx`
- `app/products/page.tsx`
- `app/peacepad/page.tsx`
- `app/saywetin/page.tsx`
- `styles/globals.css`

## 6. Performance Precautions Taken

- PNG media is rendered through `next/image`
- hero poster image remains optimized while non-critical images remain normal/lazy
- MP4 usage is kept to contained panels rather than background-takeover sections
- videos are muted, looped, play inline, and use `preload="metadata"`
- controls are exposed only on the product demo sections where explicit playback matters
- no intrusive full-screen autoplay background treatment was added
- existing route architecture and static metadata were left intact
- no media was dumped across unrelated routes
- connect page density was improved through layout, not browser-specific scaling hacks

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
5. If a dedicated PeacePad mp4 is produced later, replace the shared studio reel on `/peacepad` with the product-specific asset without changing the page structure.
