// IMPORTANT: DO NOT COMMIT THIS FILE TO GITHUB.
// This file contains your secret Firebase API key. It is loaded by index.html
// and is intended for local development only.
// For production, use environment variables.

// --- PASTE YOUR FIREBASE CONFIGURATION OBJECT BELOW ---
// You can find this in your Firebase project settings.
window.firebaseConfig = {
  apiKey: "AIzaSyB-S7vpyR0zfKnD2XNDxaOfk8gOardzucE", // <-- 🚨 PASTE YOUR KEY HERE FOR LOCAL TESTING
  authDomain: "q7-web-app1.firebaseapp.com",
  projectId: "q7-web-app1",
  storageBucket: "q7-web-app1.firebasestorage.app",
  messagingSenderId: "620235707569",
  appId: "1:620235707569:web:27451b278c04d3ba943e90",
  measurementId: "G-9KLHV7SWHY"
};

// This check helps prevent runtime errors if the file is not configured.
if (window.firebaseConfig.apiKey === "PASTE_YOUR_FIREBASE_WEB_API_KEY_HERE") {
    console.warn("Firebase config is using a placeholder API key. Please update firebase-config.js for local development.");
}
