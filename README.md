# CodeFixAI

CodeFixAI is a full-stack AI debugging assistant for students and developers. It analyzes code with Google Gemini, returns a corrected version, explains the bug in English and Khmer, and helps users understand why the fix works.

The project is split into:
- `Frontend`: React + TypeScript + Vite application
- `Backend`: Express API that sends prompts to Gemini

## Features

### Core debugging flow
- Paste code into a Monaco-powered editor
- Choose the language from the dropdown
- Optionally paste an error message or stack trace
- Run AI analysis in `Debug`, `Refactor`, or `ELI5` mode
- Receive:
  - fixed code
  - commented fixed code
  - bug summary
  - root cause
  - changes made
  - prevention tips
  - full explanation in English and Khmer

### Fixed code experience
- Normal code view and `Diff View`
- Inline diff highlighting that focuses on the changed part, not the whole line
- `Comments` toggle to switch between clean fixed code and commented fixed code
- Full-screen code modal
- Copy code, reset, and download PDF report

### Explanation experience
- English / Khmer language toggle
- Analysis, Explanation, Alternatives, and Summary tabs
- Section-based speech playback
- Khmer-aware UI typography and speech fallback handling

### Productivity features
- Recent history saved in browser `localStorage`
- Restore previous analyses from history
- Clear all history or remove individual items
- Client-side language mismatch detection
- Optional error-context input for better debugging accuracy

## Supported languages

The frontend currently supports:

- HTML
- CSS
- JavaScript
- TypeScript
- Python
- Java
- C#
- PHP
- Go
- Swift
- Kotlin
- Dart
- SQL
- C++
- Ruby

Framework-oriented code is handled through its base language. For example:
- React / Vue / Next.js -> JavaScript or TypeScript
- Django / Flask / FastAPI -> Python
- Laravel -> PHP
- ASP.NET -> C#

## Tech stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Monaco Editor
- Framer Motion
- React Router
- jsPDF
- html2canvas

### Backend
- Node.js
- Express
- `@google/genai`

### AI model
- `gemini-3-flash-preview`

## Project structure

```text
AI_Debugger Project/
|- Frontend/
|  |- src/
|  |- package.json
|  |- vite.config.ts
|  `- vercel.json
|- Backend/
|  |- Controller/
|  |- Routers/
|  |- index.js
|  `- package.json
`- README.md
```

## Local setup

### Prerequisites
- Node.js 18+
- A Google Gemini API key

### Backend

1. Open a terminal in `Backend`
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```env
API_KEY=your_gemini_api_key
PORT=3000
```

4. Start the backend:

```bash
npm run dev
```

The backend runs on `http://localhost:3000`.

### Frontend

1. Open a terminal in `Frontend`
2. Install dependencies:

```bash
npm install
```

3. Create a frontend env file if needed:

```env
VITE_API_URL=https://ai-debugger-project-backend.onrender.com
```

4. Start the frontend:

```bash
npm run dev
```

The frontend runs on the Vite dev server.

## Deployment

### Frontend on Vercel

The `Frontend` folder is ready for Vercel deployment.

Recommended Vercel settings:
- Root Directory: `Frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://your-backend-domain`

`Frontend/vercel.json` is included to rewrite routes to `index.html` for React Router.

### Backend on Render

Recommended settings:
- Root Directory: `Backend`
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:
- `API_KEY`
- `PORT` if needed by the platform

## Important notes

- The frontend calls the hosted backend API. If you change the backend prompt or Gemini behavior, you must redeploy the backend for the live app to use those changes.
- History is stored in browser `localStorage`, so it is device-specific.
- PDF export is browser-rendered to preserve Khmer readability better than raw PDF text rendering.

## Current UX highlights

- Cleaner inline diff highlighting
- Commented-code toggle in the Fixed Code panel
- Better mobile responsiveness for Fixed Code controls
- Stronger light-mode code readability
- More informative staged loading animation during analysis
- Khmer-friendly explanation UI and PDF export support

## Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

### Backend

```bash
npm run dev
npm start
```

## Future improvements

Possible future work:
- faster backend response time with lighter prompts
- optional quick PDF export mode
- stronger streaming or progress feedback from the backend
- cloud-synced history instead of local-only history

## License

This project is currently for educational and project use.
