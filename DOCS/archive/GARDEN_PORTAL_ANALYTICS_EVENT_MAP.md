# Garden Portal Analytics Event Map

## Purpose

This document defines the canonical analytics events for the Garden Cleaners regional portal conversion path.

Scope:
- Entry clicks from Garden home and services pages
- Primary CTAs on portal hero
- Region-card quote starts
- Mobile sticky CTA interactions
- Quote form submit lifecycle (attempt, success, error)

## Collection Model

The site-wide analytics listener reads click targets with:
- `data-analytics-event`
- `data-analytics-location`
- `data-analytics-label`

Event payload sent through `trackEvent(...)`:
- `location`
- `label`
- `href`

Implementation reference:
- `APPS/ftc-site/app/components/Analytics.tsx`

## Event Catalog

| Event name | Trigger surface | Expected location values | Expected label values | Primary outcome |
| --- | --- | --- | --- | --- |
| `garden_portal_entry_click` | Portal discovery links outside portal page | `garden_home`, `garden_services` | `open_regional_portal` | User enters regional portal funnel |
| `garden_portal_cta_click` | Hero CTA buttons on regional portal | `portal_hero` | `request_regional_quote`, `contact_operations` | Immediate conversion intent from portal hero |
| `garden_portal_region_quote_click` | Region card quote links | `portal_region_card` | Region name (`Oshawa`, `Whitby`, `Ajax`, `Pickering`, `Courtice`, `Durham Region`) | Region-specific quote intent |
| `garden_portal_sticky_click` | Mobile sticky CTA buttons on portal | `portal_sticky` | `get_regional_quote`, `contact_ops` | Mobile fallback conversion action |
| `garden_quote_submit_attempt` | Quote form submit pressed | N/A (form event) | N/A (form event) | Quote submission started |
| `garden_quote_submit_success` | Quote API returns success | N/A (form event) | N/A (form event) | Quote submission completed |
| `garden_quote_submit_error` | Quote API returns error / request fails | N/A (form event) | N/A (form event) | Quote submission failure visibility |

## Source References

- `APPS/ftc-site/app/garden-cleaners/page.tsx`
- `APPS/ftc-site/app/garden-cleaners/services/page.tsx`
- `APPS/ftc-site/app/garden-cleaners/portal/page.tsx`
- `APPS/ftc-site/app/components/garden-cleaners/GardenQuoteForm.tsx`

## KPI Baseline (GA4)

Track these as the first reporting cut:
- Portal entry volume:
  - count of `garden_portal_entry_click`
- Portal hero conversion intent:
  - count of `garden_portal_cta_click`
- Region-card conversion intent:
  - count of `garden_portal_region_quote_click`
  - top `label` values (region demand ranking)
- Mobile assist impact:
  - count of `garden_portal_sticky_click`
  - sticky-to-quote share: `get_regional_quote` clicks / all `garden_portal_sticky_click`
- Quote completion:
  - attempts: count of `garden_quote_submit_attempt`
  - successes: count of `garden_quote_submit_success`
  - errors: count of `garden_quote_submit_error`
  - submit success rate: `garden_quote_submit_success / garden_quote_submit_attempt`

## Suggested Funnel View

Use this event sequence for portal conversion monitoring:

1. `garden_portal_entry_click`
2. `garden_portal_cta_click` or `garden_portal_region_quote_click` or `garden_portal_sticky_click`
3. `garden_quote_submit_attempt`
4. `garden_quote_submit_success` (or `garden_quote_submit_error`)

## Live Verification Commands

Run from PowerShell:

```powershell
$portal = curl.exe -sL 'https://gardencleaners.ca/garden-cleaners/portal/'
$homeHtml = curl.exe -sL 'https://gardencleaners.ca/garden-cleaners/'
$services = curl.exe -sL 'https://gardencleaners.ca/garden-cleaners/services/'

if ($portal -match 'data-analytics-event="garden_portal_cta_click"') { 'PORTAL_HERO_OK' } else { 'PORTAL_HERO_MISSING' }
if ($portal -match 'data-analytics-event="garden_portal_region_quote_click"') { 'PORTAL_REGION_OK' } else { 'PORTAL_REGION_MISSING' }
if ($portal -match 'data-analytics-event="garden_portal_sticky_click"') { 'PORTAL_STICKY_OK' } else { 'PORTAL_STICKY_MISSING' }
if ($homeHtml -match 'data-analytics-event="garden_portal_entry_click"') { 'HOME_ENTRY_OK' } else { 'HOME_ENTRY_MISSING' }
if ($services -match 'data-analytics-event="garden_portal_entry_click"') { 'SERVICES_ENTRY_OK' } else { 'SERVICES_ENTRY_MISSING' }
```

## Change Management Rule

If any of the event names, labels, or location values change in source:
- update this document in the same PR,
- include before/after mapping in PR notes,
- re-run live verification checks.