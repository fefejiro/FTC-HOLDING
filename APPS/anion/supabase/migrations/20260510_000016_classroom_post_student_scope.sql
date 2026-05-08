-- Scope classroom posts to a single student so tutors and students only see related discussion.

alter table if exists public.classroom_posts
  add column if not exists student_id uuid references public.students(id) on delete cascade;

create index if not exists idx_classroom_posts_student_id on public.classroom_posts(student_id, created_at desc);

update public.classroom_posts cp
set student_id = s.id
from public.students s
where cp.student_id is null
  and cp.author_role = 'student'
  and s.profile_id = cp.author_profile_id;

drop policy if exists classroom_posts_select_student_tutor on public.classroom_posts;
create policy classroom_posts_select_student_tutor
  on public.classroom_posts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles viewer_profile
      join public.user_roles viewer_role on viewer_role.profile_id = viewer_profile.id
      left join public.students viewer_student on viewer_student.profile_id = viewer_profile.id
      left join public.tutors viewer_tutor on viewer_tutor.profile_id = viewer_profile.id
      where viewer_profile.auth_user_id = auth.uid()
        and (
          (
            viewer_role.role = 'student'
            and viewer_student.id = classroom_posts.student_id
          )
          or (
            viewer_role.role = 'tutor'
            and exists (
              select 1
              from public.bookings b
              where b.tutor_id = viewer_tutor.id
                and b.student_id = classroom_posts.student_id
                and b.status = 'accepted'
            )
          )
        )
    )
  );

drop policy if exists classroom_posts_insert_student_tutor_own on public.classroom_posts;
create policy classroom_posts_insert_student_tutor_own
  on public.classroom_posts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles author_profile
      join public.user_roles author_role on author_role.profile_id = author_profile.id
      left join public.students author_student on author_student.profile_id = author_profile.id
      left join public.tutors author_tutor on author_tutor.profile_id = author_profile.id
      where author_profile.id = classroom_posts.author_profile_id
        and author_profile.auth_user_id = auth.uid()
        and author_role.role = classroom_posts.author_role
        and (
          (
            classroom_posts.author_role = 'student'
            and author_student.id = classroom_posts.student_id
          )
          or (
            classroom_posts.author_role = 'tutor'
            and exists (
              select 1
              from public.bookings b
              where b.tutor_id = author_tutor.id
                and b.student_id = classroom_posts.student_id
                and b.status = 'accepted'
            )
          )
        )
    )
  );