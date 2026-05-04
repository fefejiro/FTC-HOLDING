# GARDEN CLEANERS LIVE QA DISCOVERY

**EXECUTIVE SNAPSHOT**
- Date: 2026-04-29
- Time (ET): 2026-04-29 rerun window
- Main URL tested: https://gardencleaners.ca/garden-cleaners
- All findings are based on live, unauthenticated public access. No assumptions made. All routes and modules are classified as Live/Partial/Placeholder/Missing/Access restricted.

---

## DISCOVERED LIVE STRUCTURE
| Nav/CTA/Route                | URL                                      | Classification         | Notes |
|------------------------------|------------------------------------------|------------------------|-------|
| Home                         | /                                        | Live                   | Footer nav, homepage link present |
| About                        | /about                                   | Live                   | Footer nav, loads about page |
| Services                     | /services                                | Live                   | Footer nav, loads services overview |
| Contact                      | /contact                                 | Live                   | Footer nav, loads contact page |
| Get a Quote                  | /quote                                   | Live                   | Footer nav, multiple CTA links |
| Garden Cleaners (main)       | /garden-cleaners                         | Live                   | Main landing page |
| Garden Cleaners Services     | /garden-cleaners/services                | Live                   | CTA and nav link, loads services |
| Garden Cleaners Quote        | /garden-cleaners/quote                   | Live                   | CTA and nav link, loads quote form |
| Garden Cleaners Portal       | /garden-cleaners/portal                  | Live                   | CTA and nav link, loads portal |
| Regional Portal              | /portal                                  | Live                   | Footer nav, loads portal |
| Phone CTA                    | tel:+12892000631                         | Live                   | Footer and contact section |
| Email CTA                    | mailto:uby400@gmail.com                  | Live                   | Footer and contact section |
| Region-specific quote routes | /garden-cleaners/quote?region=Whitby etc | Live                   | All region links route to quote form |
| Login/Dashboard              | N/A                                      | Missing                | No login/dashboard links found |

---

## PUBLIC SITE FINDINGS
| Area/Route                  | URL                                      | Severity   | Finding |
|-----------------------------|------------------------------------------|------------|---------|
| Home                        | /                                        | Low        | Loads cleanly, no errors |
| About                       | /about                                   | Low        | Loads cleanly, no errors |
| Services                    | /services                                | Low        | Loads cleanly, no errors |
| Contact                     | /contact                                 | Low        | Loads cleanly, no errors |
| Get a Quote                 | /quote                                   | Low        | Loads cleanly, form present |
| Garden Cleaners (main)      | /garden-cleaners                         | Low        | Loads cleanly, all CTAs visible |
| Garden Cleaners Services    | /garden-cleaners/services                | Low        | Loads cleanly, all CTAs visible |
| Garden Cleaners Quote       | /garden-cleaners/quote                   | Low        | Loads cleanly, form present |
| Garden Cleaners Portal      | /garden-cleaners/portal                  | Low        | Loads cleanly, portal loads |
| Regional Portal             | /portal                                  | Low        | Loads cleanly, portal loads |
| Mobile Nav                  | All                                      | Medium     | Menu button present, mobile nav opens as expected |
| Route Refresh               | All                                      | Low        | Refreshing routes works, no broken state |
| Broken Links/Images/Layout  | All                                      | Low        | No broken links or images found |
| Quote CTA Routing           | All                                      | Low        | All quote CTAs route to /garden-cleaners/quote or /quote as expected |

---

## ACCESS/CREDENTIAL LIMITATIONS
- No login or dashboard modules found; all tested routes are public.
- No access-restricted or credentialed flows present on public site as of this QA.

---

**Tested by:** Dev 1 QA lane
**Timestamp (ET):** 2026-04-29 rerun window
**All URLs tested:** https://gardencleaners.ca/garden-cleaners and all linked public routes
