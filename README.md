# CodeFixAI - Advanced AI Debugger 🚀

**CodeFixAI** is a professional-grade, full-stack application designed to help developers identify bugs, refactor code, and understand logic through AI-powered analysis. It features a deep integration with Google's Gemini AI to provide detailed feedback in both **English** and **Khmer**.

---

## ✨ Advanced Features

### 1. 📝 Professional Smart Editor
*   **Monaco Engine:** Powered by the same engine as VS Code.
*   **Syntax Highlighting:** Real-time coloring for 15+ programming languages.
*   **Full-Screen Mode:** Expand the editor to a massive workspace for complex coding tasks.
*   **Intelligence:** Includes line numbers, bracket matching, and smooth scrolling.

### 2. 🔄 Side-by-Side Diff View
*   **Visual Comparison:** Toggle a "Diff Mode" to see exactly what the AI changed.
*   **Color Coded:** Additions are highlighted in green, while removals are shown in red with a strikethrough.
*   **Modal Support:** Works in both the main dashboard and the Full Code View modal.

### 3. 🕰️ Local History & Persistence
*   **Recent Fixes:** Automatically saves your last 10 code analyses to your browser's local storage.
*   **One-Click Restore:** Quickly jump back to a previous fix without re-analyzing.
*   **Smart Management:** Delete individual history items or clear the entire history with a single click (includes safety confirmation).

### 4. 🧠 Intelligent Modes (including ELI5)
*   **Debug Mode:** Focuses on finding and fixing logic errors and syntax bugs.
*   **Refactor Mode:** Improves code efficiency, readability, and modern architecture.
*   **ELI5 Mode (Explain Like I'm Five):** Provides simplified explanations using analogies and non-technical language—perfect for beginners!

### 5. 🔊 Bilingual Voice Explanation
*   **Listen to Logic:** Built-in "Listen" buttons for all analysis cards.
*   **Multi-Language:** Supports high-quality text-to-speech in both English and Khmer.
*   **Granular Control:** Listen to specific sections (Bugs, Fixes, Improvements) or the entire summary.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Monaco Editor, Framer Motion.
- **Backend:** Node.js, Express, Google Generative AI (@google/genai).
- **AI Model:** Gemini 3 Flash Preview (Optimized for speed and high-thinking accuracy).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### Backend Setup
1. `cd Backend`
2. `npm install`
3. Create `.env` file: `API_KEY=your_key_here`
4. `npm run dev` (Runs on port 3000)

### Frontend Setup
1. `cd Frontend`
2. `npm install`
3. `npm run dev` (Runs on port 5173)

---

## 🌍 Localization
CodeFixAI is built with a strong focus on the Cambodian developer community, providing **100% proper Khmer script** (ភាសាខ្មែរ) for all AI explanations and UI elements.
