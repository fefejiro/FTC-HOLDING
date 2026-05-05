# Saywetin - AI-Powered Music Recognition & Cultural Context Platform

## Overview

Saywetin (Nigerian Pidgin for "What are you saying?") is a hybrid web and native mobile app that combines audio recognition (Shazam-like) with AI-powered cultural context (Genius-like, but smarter) specifically for African music. Users click a "Listen" button, the app records a few seconds of audio, identifies the song, fetches complete lyrics, and provides deep cultural translations and meanings powered by AI.

**Native Mobile App:**
- Uses Capacitor to wrap the React web app for Android/iOS
- Native audio recording via `capacitor-voice-recorder` plugin
- Solves iOS audio session conflict (browser pauses music when using microphone)
- Android project in `/android` folder, ready for APK build
- **AGP Patch Required:** After `npm install`, run `bash scripts/patch-voice-recorder-agp.sh` to remove duplicate AGP `buildscript` blocks from all Capacitor plugins (prevents Gradle classloader conflicts) before Android builds
- Android build: AGP 8.13.0, Gradle 8.14.3, compileSdk 36
- **Signing:** Release builds read from `android/keystore.properties` (not committed). Copy `keystore.properties.template` and fill in passwords.
- **CMD Build Flow:** `npm install` → `bash scripts/patch-voice-recorder-agp.sh` → `npm run build` → `npx cap sync android` → `cd android` → `gradlew bundleRelease`
- **Signed AAB output:** `android/app/build/outputs/bundle/release/app-release.aab`

**Brand:** Minimal, bold, Afrobeat-inspired with warm orange-gold-green palette matching the app icon (deep orange primary hsl(24 90% 50%), amber-gold accents, green for success states). Gradient text treatment (orange → amber → green) for "Saywetin" logo. The entire UI uses Nigerian Pidgin English for headers, labels, and feedback messages to create an authentically Nigerian experience.

**Saywetin Copy Style Guide:**
- "Dis Song Say Wetin?" → Song meaning section
- "Wetin Dem Talk?" → Detected phrases section
- "Na Wetin E Mean?" → Themes section
- "Who Be Dis Artist?" → Artist bio section
- "You Know Say?" → Fun fact section
- "Make You Join Epp Am" → Contribution CTA
- "E match well well" → High confidence badge
- "Dey find am..." / "Dey hear am..." → Loading states
- "We don catch am!" → Success messages
- "E no work o" / "No wahala" → Error states

**Core Flow:**
1. **Listen** - Click button to record 6-10 seconds of playing music
2. **Identify** - ACRCloud recognizes the song from 150M+ track database
3. **Fetch Lyrics** - Multi-source lyrics fetch (Genius, Lyrics.ovh, AZLyrics) with AI Recall fallback
4. **AI Magic** - OpenAI generates translations, cultural context, artist intent, and deeper meanings
5. **Learn** - Users see side-by-side original lyrics with expandable cultural insights

**Lyrics Pipeline (Feb 2026 update):**
- ALL sources (LRCLIB, Genius, Lyrics.ovh, AZLyrics, AI Recall) race in parallel
- LRCLIB prioritized for synced lyrics (1.5s grace window before falling back to other sources)
- LRCLIB timeouts: 3s per attempt (was 6s), 10s overall race timeout
- Lyrics cached in-memory (1hr TTL) and in database (24hr TTL)
- Artist info pre-warmed in parallel with lyrics fetch for faster fallback display
- Song DNA extraction runs fire-and-forget after analysis completes

**Real-time Updates (Feb 2026):**
- SSE endpoint `/api/recognized-tracks/:id/stream` replaces polling for instant UI updates
- Server pushes updates every 800ms during processing (was 1.5s polling)
- Client uses EventSource during processing, falls back to regular query on completion
- Artist info section auto-shows by default (no button click needed)

**Key Differentiator:**
Unlike existing apps, Saywetin focuses on **cultural context and meaning** - explaining traditions, proverbs, wordplay, and historical references in African music. It handles code-switching seamlessly (e.g., Pidgin English + Yoruba) and provides scholarly-level explanations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18+ with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management
- Tailwind CSS for styling with custom design system

**UI Component Library:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component system (New York style variant)
- Custom components built on top of Radix primitives

**Design System:**
- **Typography:** Inter for headings/UI, Merriweather/Georgia for lyric content
- **Color Palette:** Warm, African-inspired tones with primary color at `hsl(27 85% 45%)`
- **Spacing:** Consistent Tailwind spacing scale (4, 6, 8, 12, 16)
- **Layout:** Mobile-first responsive design with breakpoints for tablet and desktop
- **Component Structure:** Card-based browsing inspired by Spotify, with lyric interaction patterns inspired by Genius

**Key Pages:**
- **Home Page** (`/`) - "Listen" button with microphone recording + listening history
- **Song Detail Page** (`/song/:recognizedTrackId`) - Side-by-side lyrics with expandable cultural context cards
- **Signup Page** (`/signup`) - User registration
- **Login Page** (`/login`) - User authentication
- **History Page** - User's recognized songs and listening sessions
- **Not Found Page** - 404 error handling

**State Management:**
- TanStack Query handles all server state (songs, lyrics, translations, auth)
- Local component state for UI interactions (search, filters, voting)
- Authentication state managed via `useAuth` custom hook
- No global client state management needed

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js
- TypeScript throughout
- PostgreSQL database (configured via Drizzle)
- In-memory storage fallback (MemStorage) for development

**API Design:**
- RESTful API endpoints under `/api` prefix
- JSON request/response format
- Validation using Zod schemas

**Core API Endpoints:**
- `POST /api/listen` - Upload audio, identify song, fetch lyrics, generate AI translations
- `GET /api/recognized-tracks/:id` - Get recognized track with lyrics and translations
- `GET /api/listening-history` - Get user's recognition history
- `POST /api/favorites` - Save recognized track to favorites
- `POST /api/translations/vote` - Upvote/downvote AI translations
- `GET /api/songs/:id/export/:format` - Export Public Domain/CC songs (JSON, Text, Markdown)
- `GET /api/continuation/:trackId` - Continuation Engine: get suggested similar song based on emotional resonance, cultural themes, or regional similarity

**Build Process:**
- Client built with Vite to `dist/public`
- Server bundled with esbuild to `dist/index.cjs`
- Static file serving in production
- HMR (Hot Module Replacement) in development via Vite

**Seed Data:**
- Initial database population with traditional African songs (Zulu, Xhosa, Yoruba, Igbo)
- Automatic seeding on first run if database is empty

### Data Storage Solutions

**Database:**
- PostgreSQL as primary database
- Drizzle ORM for type-safe database operations
- Migration system via `drizzle-kit`

**Schema Design:**

**Recognized Tracks Table:**
- Stores songs identified via audio recognition (ACRCloud)
- Contains recognition metadata (confidence score, audio fingerprint)
- Stores song metadata even if not in main songs table
- Links to users and songs tables (nullable for guest users)
- **Song DNA fields** (for Continuation Engine):
  - `emotionalTone`: Dominant emotion (e.g., "joyful", "melancholic", "defiant")
  - `culturalThemes`: Array of themes (e.g., ["wealth", "love", "spirituality"])
  - `region`: Geographic origin (e.g., "Nigeria", "South Africa")
  - `era`: Time period (e.g., "2020s", "traditional")
  - `songDnaGeneratedAt`: Timestamp of DNA extraction

**Listening Sessions Table:**
- Tracks user audio recording and recognition history
- Status tracking: recording → recognizing → success/failed
- Performance metrics (audio duration, recognition time)

**Songs Table (Extended):**
- Stores song metadata with external service IDs (Spotify, YouTube, ISRC)
- Includes album, release year, duration, genre
- `externalSource` field tracks origin (acrcloud, musixmatch, manual)
- Only stores songs where lyrics storage is allowed (Public Domain/CC)

**Transient Lyrics Table:**
- Temporary storage for copyrighted song lyrics (24-hour TTL)
- Content hash for deduplication
- Auto-expires to comply with copyright
- Source tracking (musixmatch, genius, user_submitted)

**AI Translations Table:**
- Stores AI-generated translations, cultural context, artist intent, deeper meanings
- Text hash for caching/deduplication across songs
- Can link to either recognized tracks or lyric lines
- Community voting (upvotes/downvotes) for accuracy
- Reusable across songs with same lyric text

**Lyric Lines Table (Legacy):**
- Stores lyrics for Public Domain/Creative Commons songs only
- Permanent storage allowed for non-copyrighted content

**Users Table:**
- Standard authentication (username, email, hashed password)

**Favorites Table:**
- User's saved songs (links to recognized tracks)

**In-Memory Storage:**
- `MemStorage` class implements `IStorage` interface
- Used during development or when database is unavailable
- Maps-based storage for songs, lyrics, and translations

### Authentication and Authorization

**Authentication System:**
- Replit Auth (OIDC-based) with Google Sign-In and other OAuth providers
- No password management needed - delegated to identity providers
- Express session middleware with connect-pg-simple for PostgreSQL-backed sessions
- Session secret from environment variable `SESSION_SECRET`
- Auth integration files in `server/replit_integrations/auth/`

**User Management:**
- Users table stores id (from OIDC sub claim), email, firstName, lastName, profileImageUrl
- Legacy username/password/email columns kept nullable for backward compatibility
- Users auto-created/updated on OAuth login via upsertUser

**Auth Endpoints:**
- `GET /api/login` - Initiates OIDC login flow (redirects to Replit auth)
- `GET /api/callback` - OIDC callback handler
- `GET /api/logout` - Ends session and redirects to OIDC logout
- `GET /api/auth/user` - Get current authenticated user

**Frontend Auth:**
- `useAuth` custom hook queries `/api/auth/user` for auth state
- Conditional UI based on authentication status
- Login/signup pages redirect to `/api/login`
- User menu in header with logout option

### External Dependencies

**External API Integrations:**

**ACRCloud Audio Recognition:**
- Identifies songs from 6-10 second audio clips
- 150M+ song database with strong African music coverage
- Pricing: ~$6 per 1,000 requests
- Returns song metadata, external IDs (Spotify, YouTube, ISRC)
- HMAC-SHA1 authentication

**Musixmatch Lyrics API:**
- Fetches complete song lyrics by title/artist
- Commercial license required for public apps
- Fully licensed lyrics (legal to display)
- Custom pricing (contact sales@musixmatch.com)

**OpenAI Cultural Context AI:**
- GPT-4 model via Replit AI Integrations
- Specialized prompts for African language expertise
- Generates: translation, cultural context, artist intent, deeper meaning, language notes
- Structured JSON output for consistency
- Batch processing entire songs for cost efficiency

**Third-Party UI Libraries:**
- Radix UI for accessible component primitives
- Lucide React for icons
- date-fns for date formatting
- embla-carousel-react for carousels
- cmdk for command palette functionality

**Development Tools:**
- Replit-specific plugins for development experience
- TypeScript for type safety across frontend and backend
- Zod for runtime validation and type generation
- ESLint and Prettier configurations implied by tooling

**Copyright Compliance:**
- **Public Domain/Creative Commons songs**: Full storage and export allowed
- **Copyrighted songs**: 
  - Metadata stored in recognized_tracks
  - Lyrics cached temporarily (24-hour TTL) in transient_lyrics
  - AI translations stored separately (transformative use)
  - No export functionality
  - Lyrics never permanently stored in database
- **Fair Use Strategy**: Focus on transformative cultural context generation
- Clear licensing badges and attribution

**Performance Optimizations:**
- Server-side bundling with allowlist for faster cold starts
- Static file serving in production
- Query result caching via TanStack Query
- Lazy loading and code splitting via Vite