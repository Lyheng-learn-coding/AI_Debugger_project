# AI Debugger Project - Gemini Context

This document provides foundational context and instructions for the AI Debugger project.

## Project Overview

The **AI Debugger** is a full-stack application designed to help developers identify bugs, refactor code, and understand changes through AI-powered analysis. It leverages Google's Gemini AI to provide detailed feedback in both English and Khmer.

### Key Technologies

- **Frontend:**
  - **Framework:** React 18 with TypeScript and Vite.
  - **Styling:** Tailwind CSS with Shadcn UI components.
  - **State Management:** Zustand.
  - **Animations:** Framer Motion.
  - **Routing:** React Router DOM.
  - **Data Fetching:** Tanstack Query (configured, though direct `fetch` is used in `Index.tsx`).
  - **Syntax Highlighting:** React Syntax Highlighter (Prism).
- **Backend:**
  - **Runtime:** Node.js with Express.
  - **AI Integration:** `@google/genai` (Google Generative AI SDK).
  - **Environment Management:** `dotenv`.
  - **Middleware:** `cors` for cross-origin requests.

### Architecture

- **Client-Server Model:** The React frontend communicates with an Express backend via a REST API.
- **AI-Driven Logic:** The core analysis logic resides in the backend (`Backend/Controller/ApiController.js`), which constructs complex prompts for the Gemini model (`gemini-3-flash-preview`).
- **Structured Response:** The backend returns a specifically formatted string that the frontend parses into structured categories: Fixed Code, Bugs Found, Fixes Applied, Improvements, and Detailed Explanations (Bilingual: EN/KH).

---

## Building and Running

### Prerequisites

- Node.js (v18+ recommended)
- npm or bun
- A Google Gemini API Key

### Backend Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Backend` folder:
   ```env
   API_KEY=your_gemini_api_key_here
   ```
4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   The server will run at `http://localhost:3000`.

### Frontend Setup

1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will typically run at `http://localhost:5173`.

---

## Development Conventions

### Code Style

- **TypeScript:** Use TypeScript for all frontend code to ensure type safety.
- **Components:** Functional components with Hooks are preferred.
- **UI Components:** Use and extend the existing Shadcn UI components located in `Frontend/src/components/ui`.
- **Styling:** Use Tailwind CSS utility classes. Follow the "gradient-border-top" and "glow-violet" patterns for a consistent aesthetic.

### AI Interaction Patterns

- **Prompt Engineering:** Any changes to the AI analysis should be modified in `Backend/Controller/ApiController.js`. Ensure the `EXACTLY this format` instruction in the prompt is maintained to avoid breaking the frontend parser.
- **Khmer Support:** When modifying prompts, ensure the requirement for Khmer (ភាសាខ្មែរ) output is preserved.

### Testing

- **Unit/Integration Tests:** Vitest is configured in the frontend. Run `npm run test` in the `Frontend` directory.
- **End-to-End Tests:** Playwright is configured. Use `npx playwright test`.

---

## Key Files Summary

- `Backend/Controller/ApiController.js`: Main logic for Gemini AI integration and prompt construction.
- `Frontend/src/pages/Index.tsx`: Main application entry point handling the analysis workflow.
- `Frontend/src/components/ExplanationCards.tsx`: Logic for parsing the AI response and displaying bilingual cards.
- `Frontend/src/components/CodeInputPanel.tsx` / `CodeOutputPanel.tsx`: Core UI panels for code interaction.
