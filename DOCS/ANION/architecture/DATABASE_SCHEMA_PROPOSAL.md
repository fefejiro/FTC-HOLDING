# Anion Database Schema Proposal

## Principles
- Use Supabase-auth-backed identities as the root of access control
- Prefix product tables with `anion_` to reduce collision risk in the shared Supabase project
- Keep parent, student, and tutor relationships explicit
- Separate booking intent from live session execution
- Let Stripe remain the source of truth for billing events while storing mirrored state for product use

## Proposed Tables

### Identity and Roles
- `anion_profiles`
- `anion_user_roles`

### Learning Actors
- `anion_students`
- `anion_tutors`
- `anion_parents`
- `anion_parent_student_links`
- `anion_student_tutor_links`

### Scheduling and Delivery
- `anion_tutor_availability`
- `anion_bookings`
- `anion_sessions`
- `anion_session_participants`
- `anion_session_notes`

### Billing and Commercial State
- `anion_subscription_plans`
- `anion_subscriptions`
- `anion_payments`

### Quality and Retention
- `anion_reviews`

## Access Model
- Tutors manage their own profiles, availability, and session notes
- Students manage their own bookings and lesson access
- Parents can view linked student data and subscription state for those students
- Admin roles can support all records through policy-scoped elevated access

## RLS Direction
- Row-level security should anchor on Supabase auth user id and relationship tables
- Parent visibility should be driven through `anion_parent_student_links`
- Tutor access should be driven through tutor profile ownership
- Student booking access should include student and linked parent visibility

## Operational Notes
- Booking lifecycle should move through `pending`, `confirmed`, `completed`, `cancelled`, and `no_show`
- Session lifecycle should move through `scheduled`, `ready`, `live`, `ended`, and `reviewed`
- Subscription lifecycle should mirror Stripe state while preserving product-local convenience fields
