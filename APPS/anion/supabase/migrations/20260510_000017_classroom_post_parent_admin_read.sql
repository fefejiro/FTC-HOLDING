-- Allow related parents and admins to read classroom timelines for linked students.

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
      left join public.parents viewer_parent on viewer_parent.profile_id = viewer_profile.id
      where viewer_profile.auth_user_id = auth.uid()
        and (
          (
            viewer_role.role = 'admin'
          )
          or (
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
          or (
            viewer_role.role = 'parent'
            and exists (
              select 1
              from public.parent_student_links psl
              where psl.parent_id = viewer_parent.id
                and psl.student_id = classroom_posts.student_id
            )
          )
        )
    )
  );