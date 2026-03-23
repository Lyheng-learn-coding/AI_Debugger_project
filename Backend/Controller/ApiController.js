const { GoogleGenAI } = require("@google/genai");

if (!process.env.API_KEY) {
  process.exit(1);
}

const crypto = require("crypto");
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const RESPONSE_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

const CODE_KEYWORDS = [
  "function",
  "const",
  "let",
  "var",
  "if",
  "for",
  "while",
  "class",
  "import",
  "export",
  "return",
  "async",
  "await",
  "try",
  "catch",
  "switch",
  "case",
  "=>",
  "{}",
  "()",
  "[];",
  "void",
  "console.log",
  "console.error",
  "console.warn",
  "document.",
  "window.",
  "alert(",
  "Math.",
  ".length",
  ".push(",
  ".map(",
  ".filter(",
  "getElementById",
  "querySelector",
  "addEventListener",
  "setTimeout(",
  "setInterval(",
  "require(",
  "module.exports",
  "def ",
  "print(",
  "int ",
  "string",
  "public",
  "void",
  "System.out",
  "<html",
  "<div",
  "<p",
  "SELECT",
  "FROM",
  "#include",
  "printf(",
  "cout <<",
  ":=",
  "func ",
  "fmt.Println",
  "echo ",
  "puts ",
];

const buildModeInstruction = (mode) => {
  if (mode === "Refactor") {
    return "Stay bug-fix first. Fix the real bug, then make only small readability improvements when they directly support the fix.";
  }

  if (mode === "ELI5") {
    return "Explain the bug and the fix in very simple beginner-friendly language. Use analogies only when they help explain the root cause and the fix.";
  }

  if (mode === "Debug") {
    return "Focus on identifying the real bug, its root cause, and the smallest safe fix.";
  }

  return "Analyze the code for bugs, root causes, and the safest fix.";
};

const buildPrompt = ({ code, errorMessage, language, mode }) => `
You are a senior software engineer and debugging specialist.
Current Mode: ${mode}
${buildModeInstruction(mode)}

Analyze the following ${language} code and return a minimal safe fix plus short explanations.

Rules:
- The selected language is the source of truth. FIXED_CODE and COMMENTED_CODE must use valid, idiomatic ${language} syntax.
- Do not rename any functions
- Do not change the overall logic unless the bug cannot be fixed without doing so
- Always return valid runnable ${language} code
- Prefer the smallest safe fix over a large rewrite
- Preserve the original formatting, indentation, spacing, and line breaks whenever possible
- Change only the smallest possible part of the code
- Do not rewrite unchanged lines
- Do not add comments inside FIXED_CODE unless a comment is required for correctness
- Always return COMMENTED_CODE as the same fixed code but with short language-appropriate comments explaining the changed or important lines
- In COMMENTED_CODE, include at least one explanatory comment next to the main fix when the code changed
- Do not comment every line in COMMENTED_CODE
- Do NOT wrap the fixed code in markdown backticks
- Do NOT add \`\`\`${language} or \`\`\` anywhere
- Khmer explanation must be written in proper Khmer script (ភាសាខ្មែរ)
- Khmer explanation must be natural and easy to understand for beginners
- If the code has no real bug, say so clearly and return the original code unchanged
- If the snippet uses syntax from another language but the user's intent is obvious, translate only that mismatched syntax into valid ${language}
- Treat foreign-language syntax inside the selected language as a real bug, not as acceptable original code
- Example: in JavaScript, change print("hello") to console.log("hello")
- Example: in Python, change console.log("hello") to print("hello")
- If Mode is ELI5, make both English and Khmer explanations extra simple
- Keep lists short and concrete
- ERROR_SUMMARY and ROOT_CAUSE: max 1 bullet each
- CHANGES_MADE, ALTERNATIVE_FIXES, PREVENTION_TIPS: max 2 bullets each
- WHY_THIS_FIX_WORKS and WHY_THIS_FIX_WORKS_KH: max 2 short sentences each
- EXPLANATION_EN and EXPLANATION_KH: max 4 short sentences each
- Do not add any section other than the required format
- If an error message or stack trace is provided, use it as strong debugging evidence
- Mention the relationship between the code and the provided error when relevant
- Be concise. Do not add filler.

Return in EXACTLY this format and nothing else:

ERROR_SUMMARY:
- brief English summary of the main error or bug

ERROR_SUMMARY_KH:
- same summary in Khmer

ROOT_CAUSE:
- brief English explanation of the real cause

ROOT_CAUSE_KH:
- same explanation in Khmer

BUG_TYPE:
- choose one or two only: syntax, logic, runtime, type, async, scope, null-undefined, api-misuse, data-flow, no-bug-found

BUG_TYPE_KH:
- same bug type in Khmer

FIX_CONFIDENCE:
- High, Medium, or Low

FIX_CONFIDENCE_KH:
- Khmer translation of the confidence level

FIXED_CODE:
// your fixed code here, no markdown, no backticks

COMMENTED_CODE:
// same fixed code, but with short explanatory comments in the correct comment style for ${language}

CHANGES_MADE:
- list each important change in English

CHANGES_MADE_KH:
- same list in Khmer

WHY_THIS_FIX_WORKS:
// short English explanation of why the fix solves the bug

WHY_THIS_FIX_WORKS_KH:
// same explanation in Khmer

ALTERNATIVE_FIXES:
- optional alternative fix in English
- if there is no useful alternative, write: None

ALTERNATIVE_FIXES_KH:
- same content in Khmer
- if there is no useful alternative, write: None

PREVENTION_TIPS:
- short English tips to avoid this bug next time

PREVENTION_TIPS_KH:
- same tips in Khmer

EXPLANATION_EN:
// full English explanation covering what broke, why it broke, what changed, and why the fix works

EXPLANATION_KH:
// same explanation in Khmer script

${errorMessage?.trim()
  ? `Runtime Error / Stack Trace:
${errorMessage}

`
  : ""}Code to analyze:
${code}
`;

const createCacheKey = ({ code, errorMessage = "", language, mode = "Debug" }) =>
  crypto
    .createHash("sha1")
    .update(
      JSON.stringify({
        code: code.trim(),
        errorMessage: errorMessage.trim(),
        language,
        mode,
      }),
    )
    .digest("hex");

const getCachedResponse = (cacheKey) => {
  const cached = RESPONSE_CACHE.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    RESPONSE_CACHE.delete(cacheKey);
    return null;
  }

  return cached.result;
};

const setCachedResponse = (cacheKey, result) => {
  if (RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RESPONSE_CACHE.keys().next().value;
    if (oldestKey) {
      RESPONSE_CACHE.delete(oldestKey);
    }
  }

  RESPONSE_CACHE.set(cacheKey, {
    timestamp: Date.now(),
    result,
  });
};

const viewResult = async (req, res) => {
  try {
    const {
      code,
      errorMessage = "",
      language,
      mode = "Debug",
    } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        message: "Code and language are required",
      });
    }

    const hasKeyword = CODE_KEYWORDS.some((keyword) =>
      code.toLowerCase().includes(keyword.toLowerCase()),
    );
    const hasMinLength = code.trim().length > 10;
    const hasCodeSymbol = /[{}();=<>]/.test(code);

    if (!hasKeyword && !(hasMinLength && hasCodeSymbol)) {
      return res.status(400).json({
        message:
          "Please paste a valid code snippet. This tool only analyzes code.",
      });
    }

    if (code.length > 5000) {
      return res.status(400).json({
        message:
          "Code is too long. Please paste a smaller snippet (max 5000 characters).",
      });
    }

    if (errorMessage.length > 3000) {
      return res.status(400).json({
        message:
          "Error message or stack trace is too long. Please keep it under 3000 characters.",
      });
    }

    const cacheKey = createCacheKey({
      code,
      errorMessage,
      language,
      mode,
    });
    const cachedResult = getCachedResponse(cacheKey);

    if (cachedResult) {
      return res.json({
        message: "Gemini response (cached):",
        result: cachedResult,
      });
    }

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: buildPrompt({
            code,
            errorMessage,
            language,
            mode,
          }),
        }],
      }],
      config: {
        thinkingLevel: "low",
      },
    });

    setCachedResponse(cacheKey, result.text);

    return res.json({
      message: "Gemini response:",
      result: result.text,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  viewResult,
};
