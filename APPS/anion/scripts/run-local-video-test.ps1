$ErrorActionPreference = "Stop"

$env:ANION_LOCAL_DEMO = "1"
$env:ANION_LOCAL_VIDEO_MODE = "demo"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key-for-local-demo"
$env:NEXT_PUBLIC_SITE_URL = "http://localhost:4178"
$env:NEXT_PUBLIC_AUTH_REDIRECT_URL = "http://localhost:4178"
$env:SECURITY_ALLOWED_ORIGINS = "http://localhost:4178,http://127.0.0.1:4178"
$env:SECURITY_ALLOW_LOCALHOST_ORIGINS = "true"
$env:SECURITY_CSRF_MODE = "relaxed"

npx playwright test tests/local-demo-video.spec.ts
