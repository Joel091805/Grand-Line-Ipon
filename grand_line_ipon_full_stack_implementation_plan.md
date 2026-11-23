# Grand Line Ipon — 2026 Shared Savings PWA
**Comprehensive Full-Stack Architecture & Phased Implementation Plan**

| Metadata | Specification |
| :--- | :--- |
| **Project Name** | Grand Line Ipon (Shared Digital *Alkansya* PWA) |
| **Users & Goal** | **Joel** & **Min Claire** — ₱50/day each for 365 days (`₱18,250` each / `₱36,500` combined in 2026) |
| **Data Migration** | Replace `IPON CALENDAR` Excel workbook (`Jan 1 – Nov 22, 2026` = 326 days / `₱32,600` pre-filled + monthly `NOTES:`) |
| **Target Viewport** | Mobile-First PWA optimized for **iPhone 13 (`390×844`)** with iOS Safe-Area Insets & Standalone Mode |
| **Visual System** | **Hi-Bit Hybrid UI** (Top 30% 60fps Hi-Bit Pixel Art World + Bottom 70% Clean Modern iOS Deck) |
| **Tech Stack** | Vite + Preact + TypeScript + Tailwind CSS + HTML5 2D `<canvas>` + Web Audio API + Firebase RTDB + `vite-plugin-pwa` |
| **Hosting & Cost** | GitHub Pages (Static PWA) + Firebase Spark Tier (Real-Time Sync) — **₱0/month** |

---

## 1. System Architecture & Tech Stack

To achieve buttery-smooth 60fps pixel animations alongside instant, conflict-free 2-phone savings tracking, the application enforces a **strict decoupling** between the **Reactive UI Layer (Preact)** and the **Imperative Graphics/Audio Engines (Canvas & Web Audio)**.

### 1.1 High-Level Architecture Diagram

```text
+-------------------------------------------------------------------------+
|                       iPhone 13 Standalone PWA                          |
|  +-----------------------------------+  +----------------------------+  |
|  |   REACTIVE UI LAYER (Preact + TS) |  |  IMPERATIVE ENGINE LAYER   |  |
|  |  - Split-Coin 2026 Calendar       |  |  - oceanEngine.ts (Canvas) |  |
|  |  - Nami's Habulin Ledger Drawer   |  |    * 4.2s Sunny Intro      |  |
|  |  - 12-Island Month Navigator      |  |    * Treasure Chest Gate   |  |
|  |  - Robin's Captain's Log (Notes)  |  |    * Crew Milestones (10)  |  |
|  |  - 2026 Excel Batch Importer      |  |    * Coin Arc Particles    |  |
|  +-----------------+-----------------+  |  - soundEngine.ts (Audio)  |  |
|                    |                    +-------------+--------------+  |
|                    v                                  ^                 |
|  +----------------------------------------------------+--------------+  |
|  |           UNIDIRECTIONAL STATE STORE (Preact Signals)             |  |
|  |  - Optimistic Local Updates -> Emits Events to Canvas & Audio     |  |
|  +-----------------+----------------------------------+--------------+  |
|                    |                                  |                 |
|                    v                                  v                 |
|  +-----------------------------+    +--------------------------------+  |
|  | Local Persistence & Cache   |    |  Real-Time Sync Adapter        |  |
|  | - IndexedDB / localStorage  |    |  - Firebase RTDB SDK (v10+)    |  |
|  | - Workbox Service Worker    |    |  - Atomic Path Writes (j / m)  |  |
|  +-----------------------------+    +---------------+----------------+  |
+-----------------------------------------------------|-------------------+
                                                      | WebSocket (WSS)
                                                      v
                                    +----------------------------------+
                                    |  Firebase Realtime Database      |
                                    |  /rooms/{roomCode}/days/...      |
                                    |  (Synced live to Partner Phone)  |
                                    +----------------------------------+
```

### 1.2 Core Stack & Package Selection

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Build Tool** | **Vite 5+** | Sub-second HMR, tree-shaking, automatic asset content hashing for GitHub Pages. |
| **UI Framework** | **Preact + `@preact/signals` + TypeScript** | 3 KB runtime (faster cold boot on iOS Safari than React), fine-grained reactive updates without full-tree re-renders, strict type safety for 2026 date math. |
| **Styling** | **Tailwind CSS v3/v4** | Utility-first layout precision for `390×844` viewports, `tabular-nums`, and custom `safe-area-inset` utilities. |
| **Graphics & Intro** | **Vanilla TS HTML5 2D `<canvas>`** | Mounted via `useRef`; completely isolated from Preact's virtual DOM so UI taps never drop canvas frames. |
| **Audio SFX** | **Native Web Audio API** | Synthesized metallic coin clinks, ship bell, and *Habulin* chimes. Zero external `.mp3` assets; 100% immune to iOS offline audio bugs. |
| **PWA & Offline** | **`vite-plugin-pwa` (Workbox)** | Auto-generates `manifest.json` and hashed Service Worker precache so iOS Safari cleanly picks up new GitHub Pages deployments. |
| **Live 2-Phone Sync** | **Firebase Realtime Database (Spark)** | Native offline persistence, real-time WebSocket sync, atomic child-key writes (`j` and `m`) preventing overwrite conflicts. |
| **Deployment** | **GitHub Actions → GitHub Pages** | Automated lint, type-check, unit test, build, and deploy on every push to `main`. |

---

## 2. Visual Design System ("Hi-Bit Hybrid UI")

To avoid generic AI-style gradients or hard-to-read blocky pixel UI, the design follows a strict **30 / 70 Visual Boundary**.

### 2.1 Spatial Layout (`390×844` iPhone 13)
* **Top 30% (`~240px` + `env(safe-area-inset-top)`): The Hi-Bit World**
  * Houses the **4.2-second Thousand Sunny Intro**, **Clickable Treasure Chest Gate**, and the live **Grand Line Ocean Header**.
  * Drawn on a fine **Hi-Bit pixel grid (`64×64` to `96×96` sprites)** with `image-rendering: pixelated`, animated smoothly at **sub-pixel 60fps** (`requestAnimationFrame`).
* **Bottom 70% (Scrollable Thumb Zone): The Clean Modern iOS Deck**
  * Pure, flat modern surfaces (`#F8F9FA` canvas, `#FFFFFF` cards, `1px solid #E5E7EB` hairline borders, `16px` border radius).
  * Zero faux-parchment textures, zero heavy drop-shadows, zero pixel fonts for numbers.

### 2.2 Color Tokens

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--ocean-deep` | `#0B192C` | Intro sky, iOS status bar (`theme-color`), top ocean backdrop |
| `--ocean-mid` | `#163A5F` | Mid-ground parallax waves & active island route |
| `--deck-bg` | `#F8F9FA` | Bottom 70% modern deck background |
| `--card-surface` | `#FFFFFF` | Calendar card, Nami's Ledger drawer, Robin's Logbook |
| `--border-hairline` | `#E5E7EB` | Crisp `1px` dividers & card borders |
| `--ink-primary` | `#111827` | Primary peso figures, dates, headings |
| `--ink-muted` | `#6B7280` | Secondary labels, target subtext |
| `--joel-crimson` | `#D63826` | Joel's `₱50` left coin half, Joel's progress bar & Straw Hat badge |
| `--claire-teal` | `#1A7F8E` | Min Claire's `₱50` right coin half, progress bar & Tangerine badge |
| `--berry-gold` | `#E5A93C` | Completed `₱100 ✓` coin state, cleared island stars, Laugh Tale goal |

### 2.3 Typography Rules
* **Primary UI & Financial Numbers:** `Plus Jakarta Sans` (weights `500`, `600`, `700`, `800`) with `font-variant-numeric: tabular-nums` enforced on all peso counters, dates, and percentages.
* **Island & Milestone Accents:** Clean uppercase tracking (`letter-spacing: 0.08em`, `11px–12px` bold) paired with tiny `16×16` hi-bit sprite icons (Straw Hat, Tangerine, Berry Coin, Log Pose).

### 2.4 Straw Hat Crew Integration Rules
1. **Intro Sequence (`4.2s`):** Dawn parallax ocean → Thousand Sunny enters with Luffy on the figurehead, Nami at the helm, Zoro at the mast → mini *Coup de Burst* → Treasure Chest emerges from wave crest → smooth dock into the live header. Includes an instant **`Skip →`** pill in the top-right safe area.
2. **Crew Recruitment Milestones (On Deck):** Starting with Luffy & Nami (`₱0`), every **`+₱3,650` (10% of goal)** adds a hi-bit crew member to the Sunny's deck (`Zoro` → `Usopp` → `Sanji` → `Chopper` → `Robin` → `Franky` → `Brook` → `Jinbe`). With the `₱32,600` Excel import loaded, **9 of 10 Straw Hats** are on deck, with Jinbe joining at `₱36,500`.
3. **Contextual Cameos Only:**
   * **Nami:** Appears in the *Habulin* Catch-Up banner/drawer only when arrears exist.
   * **Chopper:** Appears beside the streak counter when hitting a 7+ day consecutive `₱100` streak.
   * **Robin:** Subtle antique tome icon next to the monthly `NOTES:` card.

---

## 3. Data Schema & Backend Design (Firebase RTDB)

### 3.1 Firebase Realtime Database JSON Tree
The entire 365-day year payload is compact (**< 15 KB**). Storing `j` (Joel) and `m` (Min Claire) as separate leaf keys guarantees **conflict-free simultaneous writes** from two phones.

```json
{
  "rooms": {
    "SH2026": {
      "auth": {
        "pinHash": "sha256_hex_of_4_digit_pin",
        "createdAt": 1767225600000
      },
      "meta": {
        "year": 2026,
        "dailyTarget": 50,
        "users": {
          "j": { "name": "Joel", "color": "#D63826" },
          "m": { "name": "Min Claire", "color": "#1A7F8E" }
        },
        "updatedAt": 1795457700000,
        "lastActor": "j"
      },
      "days": {
        "2026-01-01": { "j": 1, "m": 1, "ts": 1767225600000 },
        "2026-11-22": { "j": 1, "m": 1, "ts": 1795305600000 },
        "2026-11-23": { "j": 0, "m": 0, "ts": null }
      },
      "notes": {
        "2026-01": "",
        "2026-11": "326 days imported from Excel! Final stretch to Laugh Tale."
      }
    }
  }
}
```

### 3.2 Atomic Write Strategy & Offline Reconciliation
* **Single-Tap Write:** Tapping Joel's side on Nov 23 executes `update(ref(db, 'rooms/SH2026/days/2026-11-23'), { j: 1, ts: serverTimestamp() })`—never overwriting `m`.
* **Batch Writes (*Habulin* & Excel Importer):** Uses Firebase's multi-path `update(ref(db, 'rooms/SH2026'), flatUpdatesMap)` to write up to 326 days in a **single atomic network request**.
* **Offline Queue:** State updates apply optimistically to `localStorage` and Preact Signals immediately (`< 16ms` latency). Firebase's built-in offline queue automatically syncs pending atomic writes when signal returns, updating the **Den Den Mushi** status pill (`Offline / Queued` → `Live Synced`).

### 3.3 Firebase Security Rules (`database.rules.json`)
To keep setup frictionless (no email/password sign-up) while preventing unauthorized scraping or destructive wipes:
* **Anonymous Auth + Room PIN Verification:** Enable Firebase Anonymous Auth (`signInAnonymously`) silently on launch so every request has a valid `auth.uid`, and validate payload schemas strictly in rules.

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null",
        "days": {
          "$dateKey": {
            ".validate": "$dateKey.matches(/^2026-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)",
            "j": { ".validate": "newData.isNumber() && (newData.val() === 0 || newData.val() === 1)" },
            "m": { ".validate": "newData.isNumber() && (newData.val() === 0 || newData.val() === 1)" }
          }
        },
        "notes": {
          "$monthKey": {
            ".validate": "$monthKey.matches(/^2026-(0[1-9]|1[0-2])$/) && newData.isString() && newData.val().length <= 1000"
          }
        }
      }
    }
  }
}
```

---

## 4. Repository & Folder Structure

```text
grand-line-ipon/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD: typecheck, test, build, deploy to GitHub Pages
├── public/
│   ├── icons/
│   │   ├── icon-192.png            # Standard PWA icon
│   │   ├── icon-512.png            # Maskable PWA icon
│   │   └── apple-touch-icon.png    # 180x180 iOS Home Screen icon
│   └── sprites/                    # Optional hi-bit sprite sheets (or procedural TS modules)
├── src/
│   ├── main.tsx                    # Entry point & PWA SW registration
│   ├── app.tsx                     # Root layout: Intro -> Chest Gate -> 30/70 Main Shell
│   ├── styles/
│   │   └── index.css               # Tailwind directives, safe-area utilities, tabular-nums
│   ├── config/
│   │   ├── constants.ts            # 2026 targets, 12 Grand Line Island names, Crew milestones
│   │   └── firebase.ts             # Firebase app init (env-driven) & Anonymous Auth
│   ├── state/
│   │   ├── iponStore.ts            # Preact Signals store, computed totals, streaks, Habulin math
│   │   ├── syncService.ts          # Firebase RTDB listener, atomic writers, Den Den Mushi status
│   │   └── backupService.ts        # JSON export/import & URL hash fallback
│   ├── utils/
│   │   ├── calendarMath.ts         # 2026 ISO date helpers, weekday alignment, range generators
│   │   └── excelImporter.ts        # Date-range batch generator + optional CSV/XLSX parser
│   ├── engines/
│   │   ├── oceanEngine.ts          # Decoupled 60fps Canvas: 4.2s Intro, Parallax Waves, Sunny, Chest
│   │   ├── pixelSprites.ts         # Hi-Bit sprite definitions (Sunny, Chest, 10 Straw Hats, Coins)
│   │   └── soundEngine.ts          # Native Web Audio API synthesizer (clinks, bell, Habulin chord)
│   ├── components/
│   │   ├── intro/
│   │   │   ├── VoyageIntro.tsx     # 4.2s Intro wrapper + Skip pill
│   │   │   └── ChestGate.tsx       # Clickable Treasure Chest opening ritual
│   │   ├── header/
│   │   │   ├── OceanViewport.tsx   # Top 30% live Hi-Bit Canvas + Bounty HUD + Den Den Mushi pill
│   │   │   └── IslandMapSheet.tsx  # Full 12-Island vertical Grand Line route picker
│   │   ├── deck/
│   │   │   ├── TodayActionCard.tsx # 1-Tap "Drop Both (₱100)" + Dual Joel/Min Claire rings
│   │   │   ├── NamiAlertBanner.tsx # Conditional Habulin alert strip
│   │   │   ├── IslandPillStrip.tsx # Horizontal 12-month quick switcher
│   │   │   ├── SplitCoinGrid.tsx   # 7-column 2026 calendar with left/right hit zones
│   │   │   ├── QuickDayBar.tsx     # Selected day toggle chips
│   │   │   └── CaptainsLog.tsx     # Robin's monthly NOTES: card with debounced auto-save
│   │   └── modals/
│   │       ├── NamiLedgerModal.tsx # Habulin catch-up list & staggered cascade trigger
│   │       ├── SyncRoomModal.tsx   # Room Code + 4-digit PIN pairing & JSON backup
│   │       └── Import2026Modal.tsx # Quick Jan 1 - Nov 22 Excel pre-fill tool
│   └── tests/
│       ├── calendarMath.test.ts    # Unit tests for 365-day math & leap-year safety
│       ├── iponStore.test.ts       # Unit tests for totals, streaks, and Habulin arrears
│       └── excelImporter.test.ts   # Unit tests for 326-day batch pre-fill accuracy
├── database.rules.json             # Firebase RTDB security & schema validation rules
├── index.html                      # iOS meta tags, Google Fonts (Plus Jakarta Sans)
├── tailwind.config.ts              # Custom color tokens & safe-area spacing
├── vite.config.ts                  # Vite + Preact + vite-plugin-pwa (Workbox) config
├── tsconfig.json                   # Strict TypeScript config
└── package.json
```

---

## 5. Phased Development Roadmap

Each phase produces a verifiable, shippable milestone. Do not advance to the next phase until the current phase's **Definition of Done (DoD)** is met.

### Phase 0: Project Scaffolding, Tooling & CI/CD
**Goal:** Establish a clean, zero-warning Vite + Preact + TypeScript + Tailwind foundation deployed to GitHub Pages.
* **Tasks:**
  1. Initialize Vite with `preact-ts` template and install `tailwindcss`, `@preact/signals`, `firebase`, `vite-plugin-pwa`, and `vitest`.
  2. Configure `vite.config.ts` with the exact GitHub Pages `base` path (`/grand-line-ipon/`).
  3. Set up Tailwind custom tokens (`--joel-crimson`, `--claire-teal`, `--berry-gold`, `--ocean-deep`) and `tabular-nums` defaults.
  4. Configure `.github/workflows/deploy.yml` to run `tsc --noEmit`, `vitest run`, `vite build`, and deploy `dist/` to GitHub Pages.
  5. Configure `.env.local` and GitHub Repository Secrets for Firebase config keys.
* **Definition of Done:** Empty app shell builds cleanly, passes CI, and loads over HTTPS on GitHub Pages.

### Phase 1: Core State Engine, 2026 Calendar Math & Excel Importer
**Goal:** Build and unit-test 100% of the business logic before styling complex visuals.
* **Tasks:**
  1. Implement `calendarMath.ts` generating all 365 ISO keys (`2026-01-01` → `2026-12-31`) with exact 2026 weekday offsets (`Jan 1, 2026 = Thursday`).
  2. Build `iponStore.ts` using Preact Signals with computed selectors:
     * `combinedTotal`, `joelTotal`, `claireTotal`, `voyagePercent`, `unlockedCrewCount` (0–10).
     * `habulinArrears` (scans `2026-01-01` through `today`, returning exact missed dates per person).
     * `currentStreak` (consecutive `₱100` days for Chopper milestone).
  3. Implement `localStorage` hydration and persistence with schema versioning.
  4. Build `excelImporter.ts` supporting 1-tap date range batch-fill (defaulting to `2026-01-01` → `2026-11-22` = 326 days / `₱32,600`).
* **Definition of Done:** All Vitest unit tests pass (`100%` pass rate on 365-day totals, 326-day import math, and *Habulin* arrears edge cases).

### Phase 2: Backend & Real-Time 2-Phone Sync (Firebase RTDB)
**Goal:** Enable instant, conflict-free syncing between Joel's and Min Claire's phones with full offline resilience.
* **Tasks:**
  1. Provision Firebase project (Spark Free Tier), enable Anonymous Auth and Realtime Database, and deploy `database.rules.json`.
  2. Build `syncService.ts`:
     * Room Code (`e.g., SH2026`) + 4-digit PIN onboarding flow (stored locally once paired).
     * Real-time `onValue` listener merging remote changes into `iponStore.ts` without janking active UI animations.
     * Atomic leaf-key writes (`days/{date}/j`, `days/{date}/m`) and atomic multi-path batch updates for *Habulin* and Excel Import.
     * Connection monitor (`.info/connected`) driving the **Den Den Mushi** status pill (`Synced` / `Offline` / `Syncing`).
  3. Build `backupService.ts` for 1-tap JSON clipboard export and file restore as a safety net.
* **Definition of Done:** Tapping Joel's half on Device A and Min Claire's half on Device B simultaneously (and while toggling Airplane Mode) reconciles cleanly with zero lost deposits.

### Phase 3: Clean Modern Daily Deck UI (Bottom 70%)
**Goal:** Deliver a fast, ergonomic, Apple-grade daily savings tracker tailored for `390×844` thumb reach.
* **Tasks:**
  1. Build `TodayActionCard.tsx` with dual Joel/Min Claire progress rings, combined bounty readout (`₱32,600 / ₱36,500`), and the 1-tap **"Drop Both Today (₱100)"** CTA.
  2. Build `SplitCoinGrid.tsx` (7-column calendar):
     * `44×44px` circular touch targets with distinct left (Joel Crimson + mini Straw Hat) and right (Min Claire Teal + mini Tangerine) hit zones.
     * Double-tap or center-bar quick action to toggle `₱100 ✓` Berry Gold state.
  3. Build `IslandPillStrip.tsx` (12 months mapped to 12 Grand Line Islands with completion counters like `NOV • 22/30` and gold stars for completed months).
  4. Build `NamiAlertBanner.tsx` and `NamiLedgerModal.tsx` (*Habulin* drawer) with individual and combined catch-up buttons (`55ms` staggered fill animation).
  5. Build `CaptainsLog.tsx` (Robin's monthly `NOTES:` card) with 500ms debounced sync to Firebase `notes/2026-MM`.
  6. Build `Import2026Modal.tsx` and `SyncRoomModal.tsx` as smooth iOS-style slide-up bottom sheets.
* **Definition of Done:** Complete end-to-end daily workflow functions smoothly on mobile viewport with zero layout shifts or horizontal overflow.

### Phase 4: Hi-Bit Canvas Engine, 4.2s Intro & Treasure Chest Gate (Top 30%)
**Goal:** Bring the One Piece soul to life at a locked 60fps without compromising the clean UI below.
* **Tasks:**
  1. Design cohesive Hi-Bit sprite definitions (`pixelSprites.ts`) on a `64×64`–`96×96` grid using a unified 16-color nautical palette:
     * Thousand Sunny (with bobbing hull & animated sail), Articulated Treasure Chest, 10 Straw Hat crew sprites, Gold Berry Coin, and 12 miniature Island silhouettes.
  2. Build `oceanEngine.ts` (HTML5 2D `<canvas>` with HiDPI `devicePixelRatio` scaling and `imageSmoothingEnabled = false` for razor-sharp pixels):
     * **Mode A — `4.2s` Intro Sequence:** 4-layer parallax dawn ocean → Thousand Sunny sail-in with Luffy/Nami/Zoro → *Coup de Burst* steam boost → Treasure Chest emerges from wave crest.
     * **Mode B — Chest Gate:** Interactive idle chest bobbing with subtle glint; clicking triggers lid-open animation + golden light expansion into the main app.
     * **Mode C — Live Ocean Header (Top 30%):** Persistent ocean viewport showing the Sunny sailing with all unlocked Straw Hat crew members on deck (9/10 at `₱32,600`), reacting to every calendar deposit by catching a **flying Hi-Bit Berry Coin** arced up from the tapped date tile.
  3. Add a **`Skip →`** pill during the intro and a user setting (`"Quick Open"` toggle) if they ever want to bypass the intro on future opens.
* **Definition of Done:** Canvas runs at a steady 60fps on iPhone 13 Safari with `< 10%` CPU idle overhead; `Skip →` jumps cleanly to the main view with zero state glitches.

### Phase 5: Synthesized Web Audio SFX & Tactile Polish
**Goal:** Add zero-latency, offline-safe audio feedback that makes saving feel physically rewarding.
* **Tasks:**
  1. Build `soundEngine.ts` using native `AudioContext`:
     * **Intro Ambience:** Gentle filtered white-noise ocean surf + warm brass ship bell at `1.2s`.
     * **Joel Tap (`₱50`):** Crisp high brass coin clink (`E6 + B6`).
     * **Min Claire Tap (`₱50`):** Warm silver/brass coin clink (`D6 + A6`).
     * **Full Day (`₱100 ✓`):** Wooden chest thud (`110Hz`) + major triad gold chime (`C6 → E6 → G6`).
     * **Habulin Cascade:** Ascending pitch coin clinks (`+40Hz` per settled day) resolving in a 4-note shimmer chord.
  2. Implement iOS Safari `AudioContext.resume()` unlock on the very first user tap (Chest click or Skip button).
  3. Add persistent Mute/Unmute toggle in the top bar.
* **Definition of Done:** Audio triggers cleanly on iOS Safari (with silent-switch awareness), works 100% offline, and respects user mute state.

### Phase 6: PWA Hardening & iOS Safari Optimization
**Goal:** Make the web app indistinguishable from a native iOS app installed on the Home Screen.
* **Tasks:**
  1. Configure `vite-plugin-pwa` with `registerType: 'autoUpdate'`, Workbox precaching for JS/CSS/HTML/fonts, and an in-app `"New Voyage Update Ready — Reload"` toast when a new version ships.
  2. Add iOS-specific `<meta>` tags in `index.html`:
     * `apple-mobile-web-app-capable="yes"`
     * `apple-mobile-web-app-status-bar-style="black-translucent"`
     * `viewport-fit=cover` + `180×180` `apple-touch-icon.png`.
  3. Audit all sticky headers, bottom sheets, and toasts against `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` on iPhone 13 (`390×844`).
  4. Prevent accidental rubber-band pull-to-refresh glitches and iOS double-tap-to-zoom on calendar tiles (`touch-action: manipulation`).
* **Definition of Done:** Lighthouse PWA audit passes 100%; app installs cleanly via Safari → *Add to Home Screen*, opens full-screen without browser chrome, and functions completely in Airplane Mode.

### Phase 7: QA, Excel Cutover & Launch
**Goal:** Verify data accuracy against the legacy Excel workbook and deploy to both phones.
* **Tasks:**
  1. Execute full QA matrix (Section 6 below) on physical iPhone 13 Safari (both browser and standalone PWA mode).
  2. Pair Joel's and Min Claire's phones using the shared Room Code + PIN.
  3. Run the **2026 Excel Progress Importer** (`Jan 1 – Nov 22, 2026`) and cross-verify exact figures (`326 days`, `₱16,300` each, `₱32,600` combined) plus copy over any important monthly `NOTES:` from the Excel tabs.
  4. Export an initial JSON backup right after migration.
* **Definition of Done:** Both phones display identical synced `₱32,600` balances, live taps sync in `< 500ms`, and the Excel spreadsheet is officially retired.

---

## 6. Comprehensive Testing & QA Matrix

| Test Category | Scope & Specific Scenarios | Tooling / Method | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | 2026 calendar day counts (Feb = 28, total = 365), weekday offsets, 326-day import sum (`₱32,600`), *Habulin* arrears math, 7-day streak calculation, Crew milestone thresholds (`+₱3,650`). | `Vitest` (Automated in CI) | 100% pass rate; 0 TypeScript errors. |
| **Sync & Conflict Tests** | Simultaneous taps on same date (`j` on Phone A, `m` on Phone B); offline taps on Phone A + online taps on Phone B followed by reconnect; batch *Habulin* cascade sync. | 2 physical devices (or 2 isolated browser profiles) + Network Throttling | Zero overwritten deposits; both screens converge within `1s` of reconnect. |
| **Canvas & Intro Perf** | 4.2s Thousand Sunny intro frame timing, `Skip →` mid-animation cleanup, coin arc particles during rapid tapping, memory stability over 5 minutes. | Chrome DevTools Performance / Safari Web Inspector | Sustained `60fps`; no memory leaks or orphaned `requestAnimationFrame` loops. |
| **iOS Safari PWA Tests** | Notch/Home-bar safe areas (`390×844`), `AudioContext` unlock on first tap, offline launch in Airplane Mode, Service Worker update after new GitHub Pages deploy. | Physical **iPhone 13** (Installed to Home Screen) | Zero clipped UI, crisp audio on first deposit, clean offline boot. |
| **Performance Budget** | Lighthouse Mobile Audit (Performance, Accessibility, Best Practices, PWA). | Lighthouse CLI / Chrome DevTools | Initial JS bundle `< 60 KB` gzipped; Lighthouse Performance `≥ 95`, Accessibility `≥ 95`. |

---

## 7. Risk Register & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **iOS Safari blocks Web Audio until user gesture** | Intro ocean sound may stay silent on cold boot. | Keep the 4.2s visual intro silent-safe by default; unlock `AudioContext` on the **Treasure Chest tap** (or `Skip →`), playing the ship bell & chest-open chime immediately upon interaction. |
| **iOS Safari aggressive Service Worker caching** | One phone gets stuck on an older UI version after a GitHub Pages update. | Use `vite-plugin-pwa` with content-hashed filenames and an explicit `controllerchange` listener that prompts a clean reload. |
| **Accidental taps on historical paid months** | Accidentally un-marking a paid day from January–October. | Add a subtle **"Lock Past Months"** toggle (or require a 2-step confirmation in `QuickDayBar` when un-marking a date older than 7 days). |
| **Firebase Spark Free Tier limits** | Exceeding 10 GB/month bandwidth or 100 concurrent connections. | With 2 users and a `< 15 KB` JSON tree, monthly usage will be `< 5 MB` (`< 0.05%` of free tier). Still, include 1-tap JSON backup for complete data ownership. |