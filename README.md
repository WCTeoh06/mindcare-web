# ❤️ MindCare - AI-Powered Mental Health Companion

![Project Status](https://img.shields.io/badge/Status-Deployed-success?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Web%20(Mobile%20First)-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**MindCare** is a responsive, full-stack single-page application designed to provide accessible mental health support. It combines daily mood tracking, guided meditation, and crisis resources with **Serene**, an AI companion powered by Google Gemini, to help users manage stress and anxiety effectively.

## 🚀 Live Demo
**[Click here to view the Live Project on Vercel](https://mindcare-web-swart.vercel.app/)** *(Note: You will need a Gemini API Key and Firebase Config to enter the app. See Setup below.)*

---

## ✨ Key Features

### 1. 🤖 Serene AI Chat
A supportive AI companion capable of empathetic conversation.
- Powered by **Google Gemini 2.5 Flash**.
- Provides instant, context-aware responses to user feelings.
- Supports voice playback (Text-to-Speech) for a soothing experience.

### 2. 📝 Mood Journaling & Gamification
- Daily check-ins with visual mood selectors.
- Tracks user streaks (🔥) to encourage consistency.
- Data is persisted securely via **Firebase Firestore**.

### 3. 🧘 Meditation Studio
- Built-in timer for guided sessions.
- **AI-Generated Guides:** Dynamically creates meditation scripts based on selected themes (e.g., Deep Calm, Sleep, Focus).
- **Ambient Mixer:** Clean UI for selecting themes without distraction.

### 4. 📚 Resource Library
- Curated self-help cards (CBT, 3-3-3 Rule, Sleep Hygiene).
- **Daily Challenge:** Randomized actionable advice.
- **Crisis Support:** One-tap access to emergency hotlines (999, HEAL Line).

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern JavaScript (ES6+ Modules)
* **Styling:** Tailwind CSS (CDN)
* **Backend / Database:** Google Firebase (Firestore & Auth)
* **AI Integration:** Google Gemini API (REST)
* **Deployment:** Vercel (CI/CD)
* **Icons:** Lucide Icons

---

## 📱 Mobile-First Design
This project was built with a "Mobile-First" approach, ensuring a native app-like experience on phones while scaling beautifully to desktop screens. It features:
- Bottom navigation bar on mobile / Top navigation on desktop.
- Touch-friendly buttons and inputs.
- Dark Mode support (System preference & Manual toggle).

---
