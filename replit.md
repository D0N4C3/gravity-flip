# Gravity Flip - Replit Project Guide

## Overview

Gravity Flip is a fast-paced 2D endless runner mobile game built with React Native and Expo. The player controls a character that automatically runs forward through a corridor filled with obstacles. The sole mechanic is tapping the screen to flip gravity (floor ↔ ceiling). The goal is to survive as long as possible while the speed increases over time.

Key game features:
- Single-tap gravity flip control (cooldown upgradeable via Flip Speed upgrade)
- Score based on distance/time survived with passive Score Boost upgrade
- 3-tier collectible coins: standard (+1), high-value orange (+3), rare neon (+5)
- Power-ups: shield (multi-hit with Shield Armor upgrade), slowmo, double score, magnet (range upgradeable)
- Obstacles: floor/ceiling spikes, moving spikes, rotating blades, laser gates, spike walls (gap-navigation)
- Character Upgrade System: Flip Speed, Magnet Power, Shield Armor, Score Boost (4 tiers each, coin cost)
- Speed curve: linear 0–30s, faster linear 30–60s, exponential 60s+ (capped at max)
- Multiple unlockable character skins (unlocked by score milestones)
- Daily challenges with coin rewards
- Local leaderboard tracking personal best runs
- Multiple visual environments (Neon, Cyber, Lava, Ice) unlocked by score
- Pause/resume, death screen with optional revive
- Settings for music, SFX, and vibration
- Achievements and daily reward streak system

The project includes both a React Native/Expo mobile app (the actual game) and a minimal Express backend server (currently a placeholder with no game-specific routes).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)

**Framework:** React Native with Expo (~54), using Expo Router for navigation.

**Navigation:** File-based routing via Expo Router. The app has essentially one primary route (`app/index.tsx`) which acts as the main app controller, switching between `menu`, `game`, and `dead` states using local React state rather than separate routes. Modals (Skins, Leaderboard, Settings, Daily Challenges) are layered on top using React Native `Modal`.

**Game Loop:** The game runs entirely client-side in `components/GameScreen.tsx` using React Native's `Animated` API and `useRef`-based game state. No game engine is used — everything is built from scratch with React Native primitives and SVG.

**Visual Assets:** 19 custom SVG assets in `assets/hud/` covering coins (3 tiers), obstacles (floor/ceiling spikes, rotating blade, laser gate), power-up pickups (shield, magnet, slowmo, double score), character skins (default, phantom, legendary), trails, and effects. Raw SVG strings are exported from `assets/hud/index.ts` (auto-generated); `components/GameSvgs.tsx` wraps them as `SvgXml`-based React components and is the single import point for all SVG rendering in GameScreen.

**State Management:**
- **Game context** (`context/GameContext.tsx`): Provides global persistent state (best score, coins, selected skin, leaderboard, settings, daily challenges). Persisted locally using `@react-native-async-storage/async-storage`.
- **TanStack React Query** (`lib/query-client.ts`): Set up for server communication via the Express API, though not actively used for game data yet.
- Local component state handles in-game ephemeral data (current score, obstacle positions, etc.).

**Key Components:**
- `GameScreen.tsx` — Core game loop, obstacle spawning, collision detection, coin/power-up collection, combo system, environment switching
- `MainMenu.tsx` — Animated main menu with stats display
- `DeathScreen.tsx` — Post-run summary with score, coins earned, and progress toward next skin
- `PauseOverlay.tsx` — In-game pause modal
- `SkinsModal.tsx` — Skin selection and unlock progress
- `LeaderboardModal.tsx` — Personal run history ranked by score
- `SettingsModal.tsx` — Toggle music, SFX, vibration
- `DailyChallengesModal.tsx` — Daily challenge list with progress bars and claim rewards

**Styling:** Dark neon aesthetic using a centralized color palette in `constants/colors.ts`. Animations use React Native's `Animated` API throughout. `expo-linear-gradient` and `expo-blur` used for visual effects.

**Fonts:** Inter font family (Regular, Medium, SemiBold, Bold) loaded via `@expo-google-fonts/inter`.

**Haptics:** `expo-haptics` used throughout for tactile feedback on taps, deaths, and rewards.

### Backend (Express Server)

**Framework:** Express 5 running via `tsx` in development, built with `esbuild` for production.

**Current State:** Minimal placeholder. `server/routes.ts` registers no routes yet. `server/storage.ts` provides an in-memory `MemStorage` class with basic user CRUD (not yet wired to any endpoints).

**CORS:** Configured to allow Replit dev/deployment domains and localhost for Expo web development.

**Static Files:** The server serves the Expo static web build in production, acting as a combined server + static file host.

### Data Storage

**Local (primary for game data):** `AsyncStorage` stores all player progress, scores, skins, settings, and daily challenges directly on-device. No account system or server sync currently exists for game data.

**Database (provisioned but unused for game data):** PostgreSQL via Drizzle ORM. The schema (`shared/schema.ts`) defines only a `users` table with `id`, `username`, and `password`. This is boilerplate — no game-specific tables exist yet. Drizzle is configured for PostgreSQL with `drizzle-kit` for migrations.

**In-Memory Storage:** `MemStorage` in `server/storage.ts` handles user data server-side in development, but this is a placeholder pattern.

### Game Constants & Configuration

All game tuning values live in `constants/game.ts`:
- `GAME` object: player size, speeds, gap sizes, spawn chances, timing windows
- `SKINS`: array of unlockable character skins with color, shape, glow, and unlock score
- `ENVIRONMENTS`: four visual themes with colors and unlock scores
- `POWERUPS`: types and durations
- `CHALLENGE_POOL`: pool of daily challenge definitions
- `COMBO_MULTIPLIERS`: score multiplier thresholds

### Build & Deployment

- **Dev:** `expo:dev` starts Expo with Replit domain environment variables. `server:dev` runs the Express server with `tsx`.
- **Production:** `expo:static:build` builds the Expo web bundle, `server:build` bundles the server with `esbuild`, then `server:prod` serves both.
- **Replit-specific:** Scripts inject `REPLIT_DEV_DOMAIN` for Metro bundler proxy configuration so the app works over Replit's dev tunnels.

## External Dependencies

### Expo Ecosystem
- `expo-router` — File-based navigation
- `expo-haptics` — Device vibration feedback
- `expo-linear-gradient` — Gradient backgrounds and UI effects
- `expo-blur` — Blur visual effects
- `expo-font` / `@expo-google-fonts/inter` — Custom font loading
- `expo-splash-screen` — Splash screen control
- `expo-constants` — App config and environment constants
- `expo-image-picker` — (Installed, not currently used in game)
- `expo-location` — (Installed, not currently used in game)

### React Native Libraries
- `react-native-gesture-handler` — Gesture handling root
- `react-native-reanimated` — Advanced animation support
- `react-native-safe-area-context` — Safe area insets
- `react-native-screens` — Native screen optimization
- `react-native-svg` — SVG rendering for game graphics
- `react-native-keyboard-controller` — Keyboard-aware scroll (utility component, not core to game)

### Data & Networking
- `@react-native-async-storage/async-storage` — Local persistent storage for all game data
- `@tanstack/react-query` — Server state management (configured, minimal active use)
- `drizzle-orm` + `drizzle-zod` — ORM for PostgreSQL (schema defined, not actively used for game)
- `pg` — PostgreSQL client

### Backend
- `express` v5 — HTTP server
- `http-proxy-middleware` — Proxy support for Expo dev server integration

### Database
- **PostgreSQL** — Provisioned via `DATABASE_URL` environment variable. Schema exists for users table but game data is not stored server-side yet. Run `npm run db:push` to apply schema migrations.