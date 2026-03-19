if (!process.env.API_KEY) {
  console.error("CRITICAL ERROR: API_KEY is missing in Backend/.env file.");
  console.log(
    "Please create a .env file in the Backend folder and add: API_KEY=your_key_here",
  );
  process.exit(1);
}

const { GoogleGenAI } = require("@google/genai");

const viewResult = async (req, res) => {
  try {
    // 2. The new SDK uses an object for config: { apiKey: '...' }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { code, language, mode = "Debug" } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        message: "Code and language are required",
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

    // 3. New SDK method: ai.models.generateContent
    const result = await ai.models.generateContent({
      // Use the verified model ID below:
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingLevel: "low",
      },
    });

    // 4. Access the text directly from the result
    res.json({
      message: "Gemini response:",
      result: result.text, // The new SDK puts text directly on the result object
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
