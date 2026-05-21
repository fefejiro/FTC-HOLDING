# Bushy Bet Product Brief

## Positioning

Bushy Bet is a football-first Telegram betting intelligence product.
It delivers football picks with receipts, match context, and public performance tracking.

## Product Modules

- Telegram command bot for users and admins
- Picks management module (create, update, post, settle)
- Results and statistics module
- Affiliate link storage module
- Audit logging module
- Responsible gambling messaging module

## First Production Slice

Phase 1 includes:
- user command surface for today picks, results, stats, risk, and help
- admin command surface for pick lifecycle and affiliate records
- SQLite persistence for users, picks, affiliate links, and audit logs
- strict admin permissions from environment configuration
- branded formatting and mandatory responsible gambling footer on pick cards

## Future Roadmap (summary)

- deeper affiliate campaign analytics
- VIP operations readiness and segmentation
- web-based admin dashboard
- expanded football data intelligence and reporting workflows
