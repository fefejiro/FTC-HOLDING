# Premium Image Asset Register

This register tracks all premium image assets for implementation handoff, approval, and future reference. No code or asset replacement is performed by this document.

| image_id | brand  | intended_page_section | required_ratio | min_resolution | final_filename | source_prompt_ref | status   | replacement_target_file         | notes |
|----------|--------|----------------------|----------------|---------------|---------------|-------------------|----------|-------------------------------|-------|
|          |        |                      |                |               |               |                   |          |                               |       |
|          |        |                      |                |               |               |                   |          |                               |       |

---

## Implementation Order

1. **Hero images** (top-of-page, primary banners) must be implemented first for each brand and page.
2. Support section images (feature, testimonial, CTA, etc.) are implemented after hero assets are approved.
3. All assets must be approved in the register before use in production.

## Rollback

- To restore previous assets, revert the relevant image file(s) in the repo to the last approved commit.
- If a new asset is rejected, immediately restore the previous version and update the register status.
- Keep a backup of all replaced assets in a dedicated archive folder for traceability.

## Compression/Export Standard

- **Preferred formats:** webp (primary), jpg (fallback for legacy support)
- **Size budget:**
  - Hero images: ≤ 300KB (webp), ≤ 500KB (jpg)
  - Support/section images: ≤ 150KB (webp), ≤ 250KB (jpg)
- **Export guidance:**
  - Use lossless or high-quality compression for hero images
  - Use smart cropping to maintain required aspect ratio
  - All images must be optimized for web delivery and pass Lighthouse performance checks

---

> This register is the single source of truth for premium image asset implementation and approval. All changes must be documented here before deployment.
