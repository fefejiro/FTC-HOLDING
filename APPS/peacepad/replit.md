# PeacePad - Co-Parenting App

## Overview
PeacePad is a co-parenting app designed to facilitate clear communication and reduce conflict between parents. Its core purpose is to provide immediate assistance in refining user messages for clarity. While it includes supporting features like Chat, Calendar, Conch Mode, and Expenses, its primary focus remains on enhancing message clarity. The project aims to offer quick and effective help to users in high-stress situations. The app targets co-parents actively seeking communication solutions.

## User Preferences
- **Preferred communication style**: Simple, everyday language
- **Contact email**: peacepad@peacepad.ca (use for all personalization and email communications)

## System Architecture
PeacePad is an accessibility-first, mobile-first, responsive Progressive Web App (PWA) with offline support and push notifications. The frontend utilizes React 18, TypeScript, Vite, Wouter, TanStack Query, Radix UI with shadcn/ui, and Tailwind CSS, incorporating a custom vibrant color palette and dynamic theming. The backend is built with Node.js, Express.js, TypeScript, ES Modules, Drizzle ORM, and PostgreSQL (Neon serverless), offering a RESTful API and integrating Replit Auth middleware.

**Core Architectural Decisions**:
- **MVP Focus**: Prioritizing "Conch Mode" for user safety and clear communication.
- **Primary Partnership Safety System**: Enforces a single active co-parent partnership across all features to prevent confusion and enhance user safety, especially for domestic abuse survivors.
- **GPT-Native Multilingual AI**: Leverages GPT-4o-mini's native multilingual understanding for reliable, context-aware analysis and responses in over 100 languages.
- **UI/UX**: Consistent mobile-first, responsive design with dynamic theming. Features a streamlined single-slide welcome, a "Calm Breath" modal, and progressive tooltips for onboarding. Global palette softening for a calmer visual experience.
- **Proactive AI Coach System**: AI agent observes and suggests rather than blocks, with relationship memory, proactive interventions, summaries/reports, and AI coaching for message drafting (Prep Chat). AI adapts to both co-parents' Myers-Briggs personality types.
- **Two-Tiered Chat AI Moderation**: Non-intrusive typing detection with full intervention (suggestions/rewrites) only after the user presses the Send button.
- **Location Detection**: A unified, robust 4-tier location detection system (GPS, IP-based geolocation, AI enhancement via GPT-4o-mini, cached location) ensures consistent and precise location data. IP fallback is clearly labeled as "Approximate".
- **AI Boundaries**: The AI functions strictly as a communication clarity assistant, focused on rewording messages, analyzing tone, and coaching, explicitly avoiding general assistant tasks, therapy, legal, medical, or financial advice.

**Key Features & Technical Implementations:**
- **Conch Mode**: Structured turn-based conversations with real-time audio, empathy tracking, strike system, and simplified UI.
- **Messaging**: Real-time chat with empathy analysis, attachments, voice recording, personalized rewording suggestions using GPT-4o-mini, multi-language support, and a Conflict Escalation Score (CES) system. Includes a unified AI orchestrator for tone analysis.
- **Push Notifications**: WhatsApp-style native push notifications for chat and Conch Mode events using FCM.
- **Shared Functionality**: Calendar with conflict detection and smart location autocomplete, expense tracking (CRUD, settlement, receipt management) with solo mode support, shared to-do lists, and collaborative child update notes.
- **Support Resources**: "Find Support" directory with location-based domestic violence resource search, featuring smart geo-fencing and sorting. Includes global crisis resources.
- **Safety**: Encrypted safety plans using AES-256-GCM and PBKDF2, with automated email alerts.
- **Authentication**: Supports Replit Auth OAuth and 14-day Guest sessions, with user profiles, admin user flagging, and login activity tracking. Includes a dedicated server-side PKCE flow for Android OAuth.
- **Security**: Secure session cookies, CSRF protection, API authentication, user-scoped data access, Zod schema validation, secure WebSocket signaling, GDPR compliance, and partnership-scoped data isolation.

## External Dependencies

- **OpenAI API**: For AI functionalities (GPT-4o-mini).
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Authentication**: OAuth 2.0 / OpenID Connect provider.
- **Firebase Cloud Messaging (FCM)**: Native push notifications.
- **OpenStreetMap Nominatim API**: Geocoding and location data.
- **Mailjet**: Email notification service.
- **Google Analytics**: User behavior tracking.