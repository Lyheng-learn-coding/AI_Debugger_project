if (!process.env.API_KEY) {
  process.exit(1);
}

const { GoogleGenAI } = require("@google/genai");

const viewResult = async (req, res) => {
  try {
    // 2. The new SDK uses an object for config: { apiKey: '...' }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        message: "Code and language are required",
      });
    }

    const prompt = `
      You are a senior software engineer and code review tool.
      You ONLY analyze and fix code. If the input is not code, 
      reply with: "Please paste a valid code snippet."

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
      - Khmer explanation must be written in proper Khmer script (ភាសាខ្មែរ)
      - Khmer explanation must be natural and easy to understand for beginners

      Return in EXACTLY this format and nothing else:

      FIXED_CODE:
      \`\`\`${language}
      // fixed code here
      \`\`\`

      BUGS_FOUND:
      // list each bug briefly

      FIXES_APPLIED:
      // list each fix briefly

      IMPROVEMENTS:
      // list each improvement briefly

      EXPLANATION_EN:
      // full plain English explanation here
      // explain every change made in simple words
      // beginner friendly language

      EXPLANATION_KH:
      // same explanation in Khmer script here
      // ពន្យល់រាល់ការផ្លាស់ប្តូរជាភាសាខ្មែរ
      // សរសេរឱ្យងាយស្រួលយល់សម្រាប់អ្នកចាប់ផ្តើមថ្មី

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
