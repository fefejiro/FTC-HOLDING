-- AI usage is internal financial data. Keep the worker write path intact,
-- but deny every browser session except the two Una Labs owner identities.
drop policy if exists "ai_usage_events_authenticated_select" on public.ai_usage_events;
drop policy if exists "ai_usage_events_owner_select" on public.ai_usage_events;

create policy "ai_usage_events_owner_select"
on public.ai_usage_events
for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'mike.fejiro@gmail.com',
    'fejiro.efiuvwere@gmail.com'
  )
);
