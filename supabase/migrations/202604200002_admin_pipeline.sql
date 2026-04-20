-- Phase 3: Admin pipeline — allow admin to update project status
-- Run in Supabase SQL editor for project: cmxahlxcqxphszmfywzn

-- Admin can see all projects (pipeline needs cross-client visibility)
create policy "admin_read_all_projects"
  on projects for select
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

-- Admin can update any project (move through pipeline stages)
create policy "admin_update_projects"
  on projects for update
  using (auth.jwt() ->> 'email' = 'mike.fejiro@gmail.com');

-- Admin can see all milestones (needed for milestone counts in pipeline cards)
create policy "admin_read_all_milestones"
  on milestones for select
  using (
    (select auth.jwt() ->> 'email') = 'mike.fejiro@gmail.com'
  );
