import { createServerClient } from './supabase/server';

type ClassroomRole = 'student' | 'tutor';

type ProfileRow = {
  id: string;
  display_name: string;
};

type ClassroomPostRow = {
  id: string;
  author_profile_id: string;
  author_role: ClassroomRole;
  body: string;
  created_at: string;
};

export type ClassroomPost = {
  id: string;
  authorRole: ClassroomRole;
  authorName: string;
  body: string;
  createdAt: string;
};

async function getCurrentProfileRole(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('auth_user_id', user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    throw new Error('Profile not found for current user.');
  }

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('profile_id', profile.id)
    .in('role', ['student', 'tutor'])
    .order('created_at', { ascending: true })
    .limit(1);

  if (roleError) {
    throw new Error(roleError.message);
  }

  const role = roles?.[0]?.role as ClassroomRole | undefined;
  if (!role) {
    throw new Error('Only student and tutor accounts can use classroom writing.');
  }

  return {
    profile,
    role,
  };
}

export async function listClassroomPosts(limit = 50): Promise<ClassroomPost[]> {
  const supabase = await createServerClient();

  await getCurrentProfileRole(supabase);

  const { data: rows, error } = await supabase
    .from('classroom_posts')
    .select('id, author_profile_id, author_role, body, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const posts = (rows ?? []) as ClassroomPostRow[];
  const profileIds = Array.from(new Set(posts.map((post) => post.author_profile_id)));

  let profileMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    profileMap = new Map((profileRows ?? []).map((row) => [row.id as string, row.display_name as string]));
  }

  return posts.map((post) => ({
    id: post.id,
    authorRole: post.author_role,
    authorName: profileMap.get(post.author_profile_id) ?? 'Unknown',
    body: post.body,
    createdAt: post.created_at,
  }));
}

export async function createClassroomPost(input: { body: string }): Promise<void> {
  const supabase = await createServerClient();
  const { profile, role } = await getCurrentProfileRole(supabase);

  const body = input.body.trim();
  if (body.length < 2) {
    throw new Error('Write at least 2 characters.');
  }

  if (body.length > 1000) {
    throw new Error('Post is too long. Use 1000 characters or less.');
  }

  const { error } = await supabase.from('classroom_posts').insert({
    author_profile_id: profile.id,
    author_role: role,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }
}
