# Development Handoff: Q7-Lite (formerly Collectiver Culture Compass)

**Version:** 1.9
**Handoff Date:** 2026-02-26
**Point of Contact:** Product Manager

---

### Version History
*   **v1.14 (2026-05-05):**
    *   **New Feature:** Implemented **AI-Driven Profile Decoding**. Users can now click "Decode Profile" on the Results Screen to receive a personalized, 250-word narrative analysis of their Q7 scores.
    *   **Backend Architecture:** Deployed a new Firebase Cloud Function (`generateUserProfileAnalysis`) leveraging the `@google/genai` SDK and the Gemini 2.5 Flash model. The function uses an `onDocumentCreated` background trigger to generate the analysis upon profile creation, saving the output securely as a Markdown string under the `aiAnalysis` field.
    *   **Security:** API keys and prompt engineering are completely isolated on the server-side to protect intellectual property and manage API costs efficiently.
    *   **UI/UX Polish:** Integrated `react-markdown` to beautifully render the AI response. Cleaned up the Results Screen typography, changed "Go to MAPP" label to "MAPP", normalized the ChekTus button's CSS hover state to match brand guidelines, and added native tooltips (title attributes) across the primary Call-To-Action buttons.
*   **v1.13 (2026-04-14):**
    *   **New Feature:** Integrated **ChekTus v2.1** (Group Alignment Utility). Replaced the legacy StarMap toggle with a dedicated algorithmic session management interface.
    *   **Backend Architecture:** Deployed a new Cloud Function (`calculateChekTusScore`) to execute proprietary Pearson correlation arrays strictly server-side.
    *   **Optimization:** Avoided Firebase strict Composite Index limitations by sorting timestamps using robust in-memory Node.js processing rather than DB queries.
    *   **UI/UX Polish:** Introduced a distinct Brand Gold / Yellow (`var(--gold-accent)`) styling theme across the ChekTus flow. Repaired extreme UX friction during the Guest-to-Registered user flow by synchronously caching the `pendingProfileRef` state hook, seamlessly preserving guest test answers across Firebase Auth sign-up redirects without database loss. Improved button animations padding normalizations.
    *   **Database Integration:** Hardened `firestore.rules` for the new `CT_Sessions` collection to restrict access. Switched ChekTus room creation logic from 5-digit alphanumeric strings to secure 4-digit pure numeric inputs.
*   **v1.12 (2026-04-04):**
    *   **Data Export Enhancements:** Updated the local `export-data.cjs` Node script to include the `profileDistor` (Profile Distortion Index) field when generating the CSV export mapping, maintaining parity with the Firestore database structure.
*   **v1.11 (2026-03-07):**
    *   **Bug Fix:** Addressed a critical parsing error stemming from the v1.7 backend migration. The client `index.tsx` map logic was patched to fall back to `data.x` and `data.y` if the legacy `data.starCoords` object was absent, restoring visibility to all post-v1.7 profiles on the StarMap.
    *   **New Feature:** Added an Anonymous StarMap Viewer to the Guest Flow. The `<AnonymousPreviewScreen>` component now features a "View StarMap" overlay toggle (reusing the logic from the Results screen) allowing guests to view public population data.
    *   **Data Validation:** Guests entering a `teamCode` successfully hit the `publicStars` repository and properly deduplicate/color their matching teammates gold alongside the general population noise.
    *   **UI/UX:** Updated cosmetic copy strings across the `OptionalInfoScreen` label bindings.
*   **v1.10 (2026-03-05):**
    *   **New Feature:** Added "Anonymous Preview" (Guest Flow) to allow users to view a blurred, simplified profile before committing to creating an account.
    *   **Authentication Update:** Implemented Firebase Anonymous Authentication (`auth.signInAnonymously()`) attached to a new "Continue as Guest" button on the Auth Screen.
    *   **Data Structure:** Guest profiles are saved via the normal Cloud Function process but append an `{isGuest: true}` flag inside the `optionalInfo` map for easy Firestore console filtering.
    *   **New Feature:** Added a global "All-50s" edge case intercept. If a user (guest or registered) submits all 50s on the assessment, the frontend immediately intercepts the save, displays a validation warning, and redirects to app.truvtus.com after 4 seconds to protect data integrity.
*   **v1.9 (2026-02-26):**
    *   **New Feature:** Added silent IP Geolocation tracking during initial user profile creation.
    *   **Implementation:** The 'Optional Information' submission flow now executes a background fetch to `ipapi.co` to capture the user's approximate geographical location.
    *   **Data Structure:** Captures `city`, `region` (state/province), `country`, and `ip`. Data is appended securely within the `optionalInfo` map in the `profiles` Firestore collection without requiring any Cloud Function modifications.
    *   **User Experience:** Process is completely invisible. It adds zero friction and handles API failures silently without preventing successful registration.
*   **v1.8 (2026-02-26):**
    *   **Authentication Update:** Implemented a new "Google-first" authentication flow.
    *   **UI Changes:** The `AuthScreen` now prioritizes a prominent "Continue with Google" button. The traditional Email/Password login fields are hidden by default but can be accessed via an "Or continue with Email" toggle link.
    *   **Verification Bypass:** Users authenticating via Google bypass the internal email verification check, as Google handles email verification natively.
    *   **Domain Configuration:** Updated `VITE_FIREBASE_AUTH_DOMAIN` from `q7-web-app1.firebaseapp.com` to `app.truvtus.com` to ensure the correct domain is displayed on the Google OAuth consent screen.
*   **v1.7 (2026-02-03):**
    *   **SECURITY UPDATE:** Migrated proprietary Q7 algorithms from client-side to Firebase Cloud Functions.
    *   **IP Protection:** All calculation logic (calculateProfile, generateProfileCode, calculateProfileDistortion, calculatePearsonCorrelation) now executes server-side only, preventing exposure of intellectual property.
    *   **Cloud Functions Deployed:**
        *   `processQ7Assessment` - Handles user profile creation from 7-question assessment
        *   `updateVenueProfile` - Updates venue profiles based on visitor check-ins (Q7-FIKA)
        *   `calculateVenueAlignment` - Calculates user-venue compatibility scores (Q7-FIKA)
    *   **Firestore Security Rules:** Updated to prevent unauthorized client-side writes while maintaining admin exception for Q7-Admin CSV import.
    *   **Frontend Changes:** Q7-PWA and Q7-FIKA refactored to call Cloud Functions instead of performing local calculations.
    *   **Dependencies Added:** Firebase Functions SDK (firebase-functions-compat.js) added to index.html.
*   **v1.6 (2026-01-22):**
    *   **New Feature:** Added **Team View** functionality to the StarMap visualization.
    *   **User Experience:** Users with a `teamCode` can now see their team members' stars displayed as full-size static gold stars (30px, using StarIcon component) overlaid on the general population (white dots, 6px) when clicking "View StarMap".
    *   **Data Architecture:** Extended `publicStars` collection to include `teamCode` and `userId` fields for team filtering and deduplication.
    *   **Deduplication Logic:** Implemented client-side deduplication to show only the most recent star per user when multiple profiles exist with the same `teamCode`.
    *   **Visual Hierarchy:** User's star (pulsing gold StarIcon, z-index: 10) > Team members' stars (static gold StarIcon, z-index: 5) > General population (white dots, z-index: 1).
    *   **UI Text Updates:** Changed Optional Information form label from "Ref.Code (if available)" to "Ref.Code (if provided)" and placeholder from "Enter code" to "e.g. ProjectAlpha2024".
*   **v1.5 (2025-12-28):**
    *   **New Feature:** Added **Profile Distortion Index** calculation and storage.
    *   **Data Quality:** The profileDistor field measures profile consistency (average absolute difference between consecutive Q7 dimension values). Lower values (2-4) indicate thoughtful, consistent responses. Higher values (5-7) may indicate rushed or unreliable answers.
    *   **Admin Integration:** The distortion index is now saved to Firestore and displayed in the Q7-Admin Dashboard with color-coded indicators (green \u003c 4.5, yellow 4.5-5.3, red \u003e 5.3).
    *   **Function Added:** calculateProfileDistortion(rankedScores) added to core logic in index.tsx.
*   **v1.4 (2025-12-03):**
    *   **New Feature:** Added \"Ref.Code\" (Team/Referral Code) optional field to the end of the OptionalInfoScreen.
    *   **Data Hygiene:** Input for \"Ref.Code\" is automatically **trimmed** and converted to **UPPERCASE** before saving to Firestore. This ensures consistent grouping in the Admin Dashboard (Q7Dash).
*   **v1.3 (2025-12-02):**
    *   **App Renaming:** Application officially renamed to \"Q7-Lite\".
    *   **Data Architecture Update:** The profileCode (pcode) is now calculated immediately upon profile save and **stored persistently in Firestore**. This allows the \"sister\" Admin App (Q7Dash) to query and filter users by profile type without needing to download and recalculate raw scores.
    *   **UI Update:** The Results screen now pulls the profileCode directly from the database record rather than calculating it on the fly, ensuring consistency between the User view and Admin view.
    *   **Infrastructure:** Confirmed usage of Firebase Hosting targets to separate the Q7-Lite user app from the Q7Dash admin tool.
*   **v1.2 (2024-11-06):**
    *   **SECURITY UPDATE:** Removed hardcoded Firebase API key.
    *   **SECURITY UPDATE:** Added basic input sanitization.
*   **v1.1 (2024-11-05):**
    *   Implemented robust login flow and sessionStorage persistence.
*   **v1.0 (2024-10-27):** Initial project handoff.

---

### 1. Project Overview

**Q7-Lite** is a web application designed to generate a unique \"values profile\" for a user based on their answers to 7 psychometric questions. The user's profile is visualized in two ways:
1.  A **radar chart** showing the strength of 9 distinct values.
2.  A **unique star** whose coordinates are calculated from the profile, placed on a collective map.

The application includes user authentication, allowing users to save their profiles. It also features a unique \"Forget me!\" function that archives their old profile, allowing them to start anew after a configurable cooldown period.

### 2. Key Features

*   **Questionnaire Flow:** A 7-step questionnaire using slider inputs. Question order is randomized.
*   **Profile Calculation \u0026 Storage:**
    *   Algorithms convert 7 answers into 9 ranked scores and X/Y coordinates.
    *   **v1.3:** A 9-digit profileCode is generated and saved to the profiles collection in Firestore.
    *   **v1.4:** Users can enter an optional \"Ref.Code\" to link their profile to a specific team or cohort.
    *   **v1.5:** A profileDistor (Profile Distortion Index) is calculated to measure response consistency and saved to Firestore for quality analysis.
*   **Profile Visualization:** Uses Chart.js for radar charts and CSS for star positioning.
*   **User Authentication:** Firebase Auth (Email/Password) with a robust verification flow.
*   **\"Forget me!\" Functionality:** Archives current profile with a time-lock (default 30 days) before a new one can be created.

### 3. Technology Stack

*   **Frontend:** React v18 (via Vite)
*   **Language:** TypeScript
*   **Charting:** Chart.js
*   **BaaS:** Google Firebase (Auth, Firestore, Hosting)
*   **Hosting:** Firebase Hosting with **Multi-Site/Target Configuration** (separating Q7-Lite from Q7Dash).

### 4. Project Structure

*   index.html: Main entry point.
*   index.tsx: **Core Logic.** Contains all React components, state, Firebase logic, and math algorithms.
*   index.css: Tailwind CSS imports and custom styling.
*   firebase.json: Configuration for hosting targets.
*   vite.config.ts: Build configuration.

### 5. Core Logic Breakdown

#### Profile Calculation (v1.7: Now Server-Side)
**IMPORTANT:** As of v1.7, all proprietary calculation logic has been migrated to Firebase Cloud Functions for IP protection. The client-side code no longer contains these algorithms.

**Cloud Functions:**
1. **processQ7Assessment** - Replaces client-side profile creation:
   - Input: 7 raw answers (0-100 scale), userId, optionalInfo
   - Executes: calculateProfile(), generateProfileCode(), calculateProfileDistortion()
   - Output: profileCode, profileId, rankedScores, starCoords
   - Writes to: `profiles` and `publicStars` collections using Admin SDK

2. **updateVenueProfile** (Q7-FIKA) - Handles venue profiling:
   - Input: venueId, userId
   - Fetches all visits for venue, averages visitor profiles
   - Generates venue profileCode from averaged scores
   - Updates venue document with rankedScores and profileCode

3. **calculateVenueAlignment** (Q7-FIKA) - Calculates compatibility:
   - Input: userId, venueId
   - Executes: calculatePearsonCorrelation() on user and venue profiles
   - Output: alignment score (-1 to 1)

**Client-Side Integration:**
- Q7-PWA calls `processQ7Assessment` via `firebase.functions().httpsCallable()`
- Q7-FIKA calls `updateVenueProfile` and `calculateVenueAlignment` for map features
- All functions are publicly callable (required for new user registration)
- Expected latency: ~200-500ms per Cloud Function call

#### Profile Distortion Index
**Purpose:** Identifies potentially unreliable or rushed responses by measuring profile smoothness.

**Formula:** Average of absolute differences between consecutive Q7 dimensions (forming a circle):
- |UN-SD|, |BE-UN|, |TC-BE|, |SE-TC|, |PO-SE|, |AC-PO|, |HE-AC|, |ST-HE|, |SD-ST|

**Interpretation:**
- **Low (2-4):** Smooth, consistent profile indicating thoughtful responses
- **Medium (4-5.3):** Normal variation
- **High (5.3+):** Erratic pattern suggesting rushed or careless answers

**Theoretical Range:** 0-9 (typical range: 2-6)

**Implementation:** Now executed server-side in `processQ7Assessment` Cloud Function.

### 6. Firebase Integration

*   **Initialization:** Config is loaded via import.meta.env variables.
*   **Cloud Functions (v1.7):**
    *   **Location:** `functions/index.js` (Node.js 24, 2nd Gen)
    *   **Region:** us-central1
    *   **Authentication:** All functions allow public access (required for new user registration)
    *   **Admin SDK:** Functions use Admin SDK to bypass Firestore security rules
    *   **Deployment:** `firebase deploy --only functions`
*   **Firestore Security Rules (v1.7):**
    *   **File:** `firestore.rules`
    *   **Profiles:** Client-side writes blocked; only Cloud Functions can create/update
    *   **Venues:** Client can create and increment visitCount; profile updates via Cloud Function only
    *   **PublicStars:** Client-side writes blocked; handled by processQ7Assessment
    *   **Admin Exception:** `clctvr@gmail.com` has full read/write access for Q7-Admin CSV import
*   **Data Model (profiles collection):**
    *   Each document represents a user profile.
    *   **New Field (v1.3):** profileCode (String) is now mandatory for new records.
    *   **New Field (v1.5):** profileDistor (Number) stores the Profile Distortion Index.
*   **Hosting Architecture:**
    *   The project uses Firebase Hosting Targets.
    *   Target `app`: Deploys Q7-Lite (User App).
    *   (Separate Target): Deploys Q7Dash (Admin Dashboard).

### 7. Firestore Data Schema

**Collection:** profiles

| Field          | Type                     | Description                                                               |
| -------------- | ------------------------ | ------------------------------------------------------------------------- |
| userId       | string                 | Firebase Auth UID.                                                        |
| nswers      | Array\u003cnumber\u003e          | Raw answers [1-100].                                                      |
| 
ankedScores | Array\u003cnumber\u003e          | Calculated scores [1-10].                                                 |
| starCoords   | Map {x, y}             | Calculated coordinates.                                                   |
| profileCode  | string                 | **(Critical)** The unique 9-digit code. Stored for Admin Analytics.       |
| profileDistor| number                 | **(v1.5)** Profile Distortion Index (2-6 typical). Lower = more reliable. |
| optionalInfo | Map                    | Includes name, birthYear, education, source, **isGuest**, and **teamCode**.  |
| createdAt    | Timestamp              | Creation date.                                                            |
| isArchived   | boolean                | true if "forgotten".                                                    | 	rue if \"forgotten\".                                                    |

**Notes on optionalInfo.teamCode:**
*   Added in v1.4.
*   Data is normalized before storage: 	rim() and 	oUpperCase().
*   Example: User types \" team alpha \" -\u003e Saved as \"TEAM ALPHA\".

**Notes on profileDistor:**
*   Added in v1.5.
*   Automatically calculated during profile save.
*   Used by Q7-Admin Dashboard for data quality filtering and visualization.
*   Profiles with high distortion (5.3+) are flagged with red indicators in the admin interface.

**Notes on publicStars.teamCode and userId:**
*   Added in v1.6 for Team View functionality.
*   `teamCode` is normalized (trimmed and uppercased) to match the format stored in `profiles.optionalInfo.teamCode`.
*   `userId` enables deduplication when users create multiple profiles with the same team code.
*   Legacy stars (created before v1.6) will have `null` values for these fields and appear as white dots only.

### 8. Known Issues \u0026 Setup Requirements

1.  **Legacy Data Migration (High Priority):**
    *   **Problem:** Profiles created prior to v1.3 **do not** have the profileCode field stored in Firestore.
    *   **Symptom:** Users with older profiles will see a blank space where the code should be on the Results screen, and these users will not be filterable in Q7Dash.
    *   **Fix Required:** A one-time Cloud Function or Admin Script must be run to iterate over all existing profiles documents, recalculate the code based on the stored nswers, and write the profileCode field back to the document.

2.  **Profile Distortion Backfill (Medium Priority):**
    *   **Problem:** Profiles created prior to v1.5 **do not** have the profileDistor field.
    *   **Impact:** Admin Dashboard cannot display distortion metrics for legacy profiles.
    *   **Fix:** Run a migration script to calculate and add profileDistor to existing profiles using their stored 
ankedScores.

3.  **Team View Legacy Data (Low Priority):**
    *   **Problem:** Stars created prior to v1.6 **do not** have `teamCode` or `userId` fields in `publicStars`.
    *   **Impact:** Legacy stars will always appear as white dots, even if the original profile had a `teamCode`.
    *   **Workaround:** Acceptable for MVP. New profiles will have full Team View functionality.
    *   **Fix (Optional):** Cross-reference `profiles` collection to backfill `teamCode` and `userId` for existing `publicStars` documents.

4.  **Firestore Security Rules:****
    *   Ensure rules allow the Admin App (Q7Dash) to read these profiles (usually handled via Admin SDK or specific role-based rules), while strictly limiting Q7-Lite users to only reading/writing their *own* data.

4.  **Environment Variables:**
    *   Ensure .env files contain the correct Firebase keys for the production environment before building.

---

**End of Handoff**

