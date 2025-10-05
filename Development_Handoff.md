# Development Handoff: Collectiver Culture Compass

**Version:** 1.2
**Handoff Date:** 2024-11-06
**Point of Contact:** Product Manager

---

### Version History
*   **v1.2 (2024-11-06):**
    *   **SECURITY UPDATE:** Removed hardcoded Firebase API key from source code. The key is now expected to be loaded from a `process.env.API_KEY` environment variable to prevent credentials exposure.
    *   **SECURITY UPDATE:** Added basic input sanitization for user-provided name to prevent malformed data entry.
    *   Updated documentation to reflect new security-related setup steps and added a critical warning about Firestore rules.
*   **v1.1 (2024-11-05):**
    *   Implemented a robust login flow for newly verified users to prevent race conditions and ensure pending profiles are saved correctly.
    *   Added `sessionStorage` persistence for pending profiles to prevent data loss on page reload during the verification process.
    *   Corrected a critical configuration error in `index.html`'s `importmap` that was loading conflicting versions of React, ensuring application stability.
    *   Updated documentation to reflect these changes.
*   **v1.0 (2024-10-27):** Initial project handoff.

---

### 1. Project Overview

The Collectiver Culture Compass is a web application designed to generate a unique "values profile" for a user based on their answers to 7 psychometric questions. The user's profile is visualized in two ways:
1.  A **radar chart** showing the strength of 9 distinct values.
2.  A **unique star** whose coordinates are calculated from the profile, intended for a future "collective map" visualization.

The application includes user authentication, allowing users to save their profiles. It also features a unique "Forget me!" function that archives their old profile, allowing them to start anew after a configurable cooldown period, while preserving all historical data for research purposes.

### 2. Key Features

*   **Questionnaire Flow:** A 7-step questionnaire using slider inputs for nuanced answers. Question order is randomized for each session.
*   **Profile Calculation:** A proprietary algorithm (see `calculation_specification.md`) converts the 7 answers into 9 ranked value scores, a unique 9-digit profile code, and a set of {x, y} coordinates.
*   **Profile Visualization:** Uses Chart.js to render the radar chart and dynamically positioned CSS elements for the user's star.
*   **User Authentication:** Full email/password registration and login functionality powered by Firebase Authentication. Features a robust verification flow that reliably handles profile creation for newly verified users.
*   **Profile Persistence:** User profiles are saved to a Firestore database. The app automatically fetches a logged-in user's active profile upon load. Pending profiles for new users are temporarily stored in `sessionStorage` to prevent data loss during the email verification process.
*   **"Forget me!" Functionality:** Allows users to archive their current profile and take the questionnaire again. This is gated by a time-lock to prevent abuse. Archived data is preserved in the database for backend analysis.
*   **Admin Configuration:** Key operational parameters (e.g., login requirements, cooldown periods) are managed via constants at the top of the main script for easy access.

### 3. Technology Stack

*   **Frontend Framework:** React v18 (with Hooks)
*   **Language:** TypeScript (transpiled in-browser via Babel Standalone)
*   **Charting Library:** Chart.js
*   **Backend-as-a-Service (BaaS):** Google Firebase
    *   **Authentication:** Firebase Auth (Email/Password provider)
    *   **Database:** Firestore
*   **Environment:**
    *   No build step. The application runs directly in the browser.
    *   Modules are loaded via `importmap` from `esm.sh` and a CDN.

### 4. Project Structure

The project is a single-page application contained in a flat file structure.

*   `index.html`: The main HTML document. It loads all necessary libraries (Firebase, Chart.js, React, Babel) via a script `importmap` and loads the main application script.
*   `index.tsx`: **The core of the application.** This single file contains all React components, state management logic, Firebase interactions, and the profile calculation functions.
*   `styles.css`: All CSS for the application, including layout, animations, and responsive design.
*   `calculation_specification.md`: The canonical document detailing the formulas for calculating profile scores and coordinates.
*   `metadata.json`: Configuration file for the hosting environment.
*   `Development_Handoff.md`: This document.

### 5. Core Logic Breakdown

#### Profile Calculation
The calculation logic is contained within two key functions in `index.tsx`, based on `calculation_specification.md`:

1.  `calculateProfile(answers)`: Takes the array of 7 answers (1-100) and returns an object containing `rankedScores` (an array of 9 values scaled 1-10 for the chart) and `starCoords` ({x, y} position).
2.  `generateProfileCode(rankedScores)`: Takes the `rankedScores` array, determines the rank of each of the 9 values (from 1st to 9th), and assembles a 9-digit string representing the profile's unique shape.

#### State Management (App Component)
The primary state is managed within the `App` component using React Hooks (`useState`, `useEffect`, `useMemo`, `useRef`).

*   `screen`: Controls which view is currently visible to the user (e.g., 'welcome', 'questionnaire', 'results', 'auth').
*   `user`: Holds the current Firebase user object or `null`.
*   `profileData`: Stores the calculated profile object (`rankedScores`, `starCoords`).
*   `profileInfo`: Holds metadata about the saved profile, like its Firestore `id` and `createdAt` timestamp, which is crucial for the "Forget me!" cooldown logic.
*   The `App` component also manages the creation of pending profiles for new users. This state is passed from the `AuthScreen` via a direct callback (`onSuccessfulVerifiedLogin`) to ensure it is saved after a successful, verified login.

### 6. Firebase Integration

*   **Initialization:** Firebase is initialized at the top of `index.tsx`. The configuration object must be populated with your project's details, and the API key must be provided via an environment variable.
*   **Auth Listener & Login Flow:**
    *   The `auth.onAuthStateChanged` listener is a key piece of logic that reacts to login/logout events. It is responsible for fetching an existing user's active profile from Firestore or clearing session data on logout.
    *   To handle the specific edge case of a new user registering, verifying their email in a separate tab, and then logging in immediately, a direct callback (`onSuccessfulVerifiedLogin`) is used. This callback is triggered from the `AuthScreen` and directly instructs the main `App` component to save the pending profile, bypassing potential race conditions with the `onAuthStateChanged` listener.
    *   To prevent data loss if the user reloads the page during this process, pending profile data (answers and optional info) is persisted to `sessionStorage`.
*   **Data Model:** All data is stored in a single Firestore collection named `profiles`.

### 7. Admin Configuration

To modify key operational parameters, edit the constants at the top of `index.tsx`:

*   `REQUIRE_AUTH_TO_VIEW_RESULTS` (boolean): If `true`, users must create an account or log in to see their results screen. If `false`, anonymous users can see their results, but the profile will not be saved.
*   `PROFILE_CREATION_COOLDOWN_HOURS` (number): Defines the number of hours a user must wait after "forgetting" their profile before they can create a new one.

### 8. Firestore Data Schema

**Collection:** `profiles`

Each document in this collection represents a single user profile instance.

| Field          | Type                     | Description                                                               |
| -------------- | ------------------------ | ------------------------------------------------------------------------- |
| `userId`       | `string`                 | The Firebase Auth UID of the user. Absent for anonymous profiles.         |
| `userEmail`    | `string` \| `null`         | The user's email address, for reference.                                  |
| `answers`      | `Array<number>`          | The raw answers [1-100] from the 7 questions.                             |
| `rankedScores` | `Array<number>`          | The calculated scores [1-10] for the 9 values.                            |
| `starCoords`   | `Map {x, y}`             | The calculated coordinates for the user's star.                           |
| `profileCode`  | `string`                 | The unique 9-digit code for the profile shape.                            |
| `optionalInfo` | `Map`                    | User-submitted optional data (name, birthYear, etc.).                     |
| `createdAt`    | `Timestamp`              | The server-side timestamp of when the profile was created.                |
| `isArchived`   | `boolean`                | `true` if the user has "forgotten" this profile. Defaults to `false`.     |
| `archivedAt`   | `Timestamp`              | Server-side timestamp of when the profile was archived.                   |

### 9. Local Setup & Running

**IMPORTANT:** This project is designed to be run with a build process (like Vite or Webpack) that can handle environment variables. The in-browser transpilation is for demonstration only and cannot securely load the required API key.

1.  **Firebase Project:** Create a new Firebase project.
2.  **Add Web App:** Add a new Web App to your Firebase project to get your configuration details.
3.  **Environment Variable:** In a project with a build process, you would create a `.env` file in your project root and add your Firebase Web API Key:
    *   For Vite: `VITE_API_KEY=AIzaSy...`
    *   For Create React App: `REACT_APP_API_KEY=AIzaSy...`
4.  **Update Config:** Ensure the `firebaseConfig` in `index.tsx` is populated with your project's details (projectId, authDomain, etc.). The `apiKey` is loaded automatically from the environment variable.
5.  **Enable Services:** In the Firebase Console, enable **Authentication** (with the Email/Password provider) and **Firestore**.
6.  **Install & Run:** In a standard setup, you would run `npm install` and `npm start` (or `npm run dev`). This will start a local development server that makes the environment variables available to the application.

### 10. Future Improvements & Considerations

*   **CRITICAL - Firestore Security Rules:** This is the highest priority security vulnerability. The default Firestore rules are insecure and will cause permission errors in the app. You **MUST** replace them with the rules below before the application will function correctly.

    **How to update your rules:**
    1.  Go to your Firebase project console.
    2.  Navigate to **Firestore Database** -> **Rules** tab.
    3.  Delete the existing content and paste the entire block of code below.
    4.  Click **Publish**.

    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
    
        // Profiles can only be created, read, or updated by the user who owns them.
        // Deletion is not allowed.
        match /profiles/{profileId} {
          // Allow a user to create a profile if they are logged in and the
          // 'userId' in the new document matches their own user ID.
          allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    
          // Allow a user to read or update their own profile.
          // This is used for loading the profile and for the "Forget me!" feature.
          allow read, update: if request.auth != null && request.auth.uid == resource.data.userId;
    
          // Explicitly deny deletion to protect data.
          allow delete: if false;
        }
    
        // The collective map data is public.
        // Anyone can read the star data and add their own anonymous star.
        // No one can modify or delete existing stars.
        match /publicStars/{starId} {
          allow read, create: if true;
          allow update, delete: if false;
        }
      }
    }
    ```
    **Explanation:**
    *   **`/profiles/{profileId}`:** These rules protect user data. They ensure that a user can only ever interact with their own profile documents. `request.resource.data` is used for `create` to check the incoming data, while `resource.data` is used for `read` and `update` to check the data that already exists in the database.
    *   **`/publicStars/{starId}`:** These rules allow the "Collective Map" to work. The app writes anonymous star coordinates to this collection. It is safe for this to be public because it contains no personally identifiable information.
*   **Collective Map Visualization:** The app calculates `starCoords` but does not yet implement the collective map. This is the most significant planned feature. It will require reading multiple profiles from Firestore and rendering them efficiently on a canvas.
*   **Build Process:** The in-browser Babel transpilation is excellent for rapid prototyping but is not performant for production. The project should be migrated to a standard build tool like Vite or Create React App. This is now a requirement for securely handling the API key.
*   **Admin Panel:** The admin configurations in `index.tsx` should be moved to a secure admin panel or a separate configuration document in Firestore to avoid direct code edits for simple changes.