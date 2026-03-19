if (!process.env.API_KEY) {
  process.exit(1);
}

const { GoogleGenAI } = require("@google/genai");

const viewResult = async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { code, language, mode = "Debug" } = req.body;

    // Validate required fields
    if (!code || !language) {
      return res.status(400).json({
        message: "Code and language are required",
      });
    }

    // ✅ Validate that input is actually code
    const codeKeywords = [
      // JavaScript / TypeScript
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
      // Console & DOM
      "console.log",
      "console.error",
      "console.warn",
      "document.",
      "window.",
      "alert(",
      // Array & Math methods
      "Math.",
      ".length",
      ".push(",
      ".map(",
      ".filter(",
      // DOM methods
      "getElementById",
      "querySelector",
      "addEventListener",
      // Timers & Node.js
      "setTimeout(",
      "setInterval(",
      "require(",
      "module.exports",
      // Python
      "def ",
      "print(",
      // Java / C#
      "int ",
      "string",
      "public",
      "void",
      "System.out",
      // HTML
      "<html",
      "<div",
      "<p",
      // SQL
      "SELECT",
      "FROM",
      // C / C++
      "#include",
      "printf(",
      "cout <<",
      // Go
      ":=",
      "func ",
      "fmt.Println",
      // PHP
      "echo ",
      // Ruby
      "puts ",
    ];

    const hasKeyword = codeKeywords.some((keyword) =>
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

    // ✅ Character limit check
    if (code.length > 5000) {
      return res.status(400).json({
        message:
          "Code is too long. Please paste a smaller snippet (max 5000 characters).",
      });
    }

    let modeInstruction = "";
    if (mode === "Refactor") {
      modeInstruction =
        "Focus on making the code more efficient, readable, and modern. Even if there are no bugs, improve the architecture.";
    } else if (mode === "Debug") {
      modeInstruction =
        "Focus on identifying and fixing bugs, errors, and logic flaws.";
    } else {
      modeInstruction = "Analyze the code for both bugs and improvements.";
    }

    const prompt = `
      You are a senior software engineer and code review tool.
      Current Mode: ${mode}
      ${modeInstruction}

      Analyze the following ${language} code step by step:

      STEP 1 - IDENTIFY: List all bugs and errors found
      STEP 2 - FIX: Return the complete fixed and refactored code
      STEP 3 - COMMENT: Add brief comments above each function
      STEP 4 - EXPLAIN: Plain English summary of every change
      STEP 5 - TRANSLATE: Translate the explanation into Khmer language

      Rules:
      - Do not rename any functions
      - Do not change the overall logic
      - Always return valid runnable ${language} code
      - Keep comments short and clear
      - Do NOT wrap the fixed code in markdown backticks
      - Do NOT add \`\`\`${language} or \`\`\` anywhere
      - Khmer explanation must be written in proper Khmer script (ភាសាខ្មែរ)
      - Khmer explanation must be natural and easy to understand for beginners

      Return in EXACTLY this format and nothing else:

      FIXED_CODE:
      // your fixed code here, no markdown, no backticks

      BUGS_FOUND:
      // list each bug briefly in English

      BUGS_FOUND_KH:
      // list each bug briefly in Khmer script (ភាសាខ្មែរ)

      FIXES_APPLIED:
      // list each fix briefly in English

      FIXES_APPLIED_KH:
      // list each fix briefly in Khmer script (ភាសាខ្មែរ)

      IMPROVEMENTS:
      // list each improvement briefly in English

      IMPROVEMENTS_KH:
      // list each improvement briefly in Khmer script (ភាសាខ្មែរ)

      EXPLANATION_EN:
      // full plain English explanation here

      EXPLANATION_KH:
      // same explanation in Khmer script here

      Code to analyze:
      ${code}
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingLevel: "low",
      },
    });

    res.json({
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
