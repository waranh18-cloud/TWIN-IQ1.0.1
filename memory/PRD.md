# Twin IQ – Product Requirements

## Vision
AI-powered success coach for students. Personalized roadmaps, daily missions, gamification (XP/levels/streaks/badges), AI mentor chat, daily check-ins with AI reflection, and weekly progress reports.

## Stack
- Frontend: Expo (SDK 54) React Native + expo-router (tab navigation)
- Backend: FastAPI + MongoDB (motor)
- AI: Google Gemini `gemini-3-flash-preview` via `emergentintegrations` library (user's GEMINI_API_KEY)
- Auth: Emergent-managed Google Social Login (session token stored in expo-secure-store on mobile, localStorage on web)

## Features implemented (MVP)
1. **Google OAuth landing** → session exchange → `/api/auth/session`
2. **Conversational onboarding** (14 questions with quick-reply chips + free text) → `/api/onboarding/complete` triggers AI roadmap generation
3. **AI Roadmap generation** (long-term / monthly / weekly / daily missions) via Gemini JSON output
4. **Dashboard** – hero gradient card with motivational message, XP/streak/level pills, focus/productivity scores, today's missions, check-in CTA
5. **Missions** – tap to complete → XP gain, level-up, streak update, badge unlock logic
6. **Roadmap tab** – vision, weekly milestones, monthly timeline, today's blueprint, regenerate button
7. **AI Coach chat** – mentor-style, uses recent conversation history, persisted per user
8. **Daily Check-in modal** – mood, productivity, focus, distractions, learning → AI reflection insight
9. **Progress tab** – XP ring, weekly XP bar chart, daily focus/productivity bars, achievement badge grid
10. **Profile** – user info, journey snapshot, actions (regenerate roadmap / check-in / sign out)

## Design
- Blue/purple gradient brand, glassmorphism accents (expo-blur), dark & light modes with system-follow
- Plus Jakarta Sans headings, Geist body (fallback: system)
- Apple/Notion/Duolingo-inspired polish, rounded cards, gradient buttons, haptic feedback

## Data model (MongoDB collections)
- `users` – profile, xp, level, streak, badges, onboarded
- `user_sessions` – session_token, user_id, expires_at (TTL)
- `roadmaps` – long_term/monthly/weekly/daily_missions per user per date
- `missions` – per-day mission list with completion state
- `checkins` – daily reflection + AI insight
- `coach_messages` – chat history per user

## API surface (prefix `/api`)
- `POST /auth/session`, `GET /auth/me`, `POST /auth/logout`
- `GET /onboarding/questions`, `POST /onboarding/complete`
- `GET /dashboard`, `GET /roadmap`, `POST /roadmap/regenerate`
- `POST /missions/complete`
- `POST /checkin`, `GET /checkin/today`
- `GET /coach/history`, `POST /coach/message`
- `GET /reports/weekly`
