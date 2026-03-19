const { GoogleGenAI } = require("@google/genai");

if (!process.env.API_KEY) {
  process.exit(1);
}

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

const buildPrompt = ({ code, language, mode }) => `
You are a senior software engineer and debugging specialist.
Current Mode: ${mode}
${buildModeInstruction(mode)}

Analyze the following ${language} code step by step.
Your job is to help the user understand:
1. What error or bug exists
2. Why it happens
3. How you fixed it
4. Why the fix works
5. How to avoid the same bug next time

Rules:
- Do not rename any functions
- Do not change the overall logic unless the bug cannot be fixed without doing so
- Always return valid runnable ${language} code
- Prefer the smallest safe fix over a large rewrite
- Add only brief comments when they help explain a non-obvious fix
- Do NOT wrap the fixed code in markdown backticks
- Do NOT add \`\`\`${language} or \`\`\` anywhere
- Khmer explanation must be written in proper Khmer script (ភាសាខ្មែរ)
- Khmer explanation must be natural and easy to understand for beginners
- If the code has no real bug, say so clearly and return the original code with only minimal safe cleanup
- If Mode is ELI5, make both English and Khmer explanations extra simple
- Keep lists short and concrete
- Do not add any section other than the required format

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

Code to analyze:
${code}
`;

const viewResult = async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { code, language, mode = "Debug" } = req.body;

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

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: buildPrompt({ code, language, mode }) }] }],
      config: {
        thinkingLevel: "low",
      },
    });

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
