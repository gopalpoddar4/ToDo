# DateWise To-Do App

A premium, production-quality Date-Wise To-Do web application built using HTML5, CSS3, Vanilla JavaScript, and Firebase.

## Key Concept
The core architecture of this app is built entirely around Dates.
**SELECT A DATE → SHOW ONLY THAT DATE'S TASKS → CALCULATE ONLY THAT DATE'S PROGRESS.**

## Features
- **Date-Scoped Architecture**: All tasks and progress are completely isolated by date (YYYY-MM-DD).
- **Firebase Realtime Database**: Uses scoped listeners per date to ensure high performance.
- **Firebase Authentication**: Full user signup, login, logout, and password recovery.
- **Premium UI/UX**: Custom CSS variables, dark/light themes, smooth transitions, and a responsive layout.
- **Micro-interactions**: Task completion animations, toast notifications, and optimistic UI transitions.
- **Horizontal Date Selector**: Intuitive daily navigation including "Today" detection safely managed via local timezone logic.

## Deployment Instructions (GitHub Pages)

This application is ready to be hosted on GitHub Pages or any static hosting service.

1. **Add Your Firebase Config:**
   Open `script.js` and locate the `firebaseConfig` object at the top of the file. Paste your real Firebase project configuration there.
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       databaseURL: "YOUR_DATABASE_URL",
       projectId: "YOUR_PROJECT_ID",
       // ...
   };
   ```

2. **Set Firebase Security Rules:**
   Ensure your Realtime Database rules protect user data:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid === $uid",
           ".write": "auth != null && auth.uid === $uid"
         }
       }
     }
   }
   ```

3. **Deploy:**
   Since this is a vanilla stack with no build steps, simply push this directory to your GitHub repository and enable GitHub Pages on the main branch. The relative pathing ensures assets load correctly.

## Architecture

- `index.html`: The application shell containing Auth, Dashboard, and Modal views.
- `style.css`: Contains CSS variables for theming, component styling, and responsive queries.
- `script.js`: Handles Firebase initialization, Auth state, Date generation, Realtime DB listeners, and UI manipulation. Uses modern ES modules and CDNs.
