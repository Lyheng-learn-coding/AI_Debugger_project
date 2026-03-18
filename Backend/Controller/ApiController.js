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

        Analyze the following ${language} code and do this step by step:

        STEP 1 - IDENTIFY: List all bugs, errors, and improvements needed.
        STEP 2 - FIX: Return the complete fixed and refactored code.
        STEP 3 - COMMENT: Add a brief comment above each function 
                explaining its purpose.
        STEP 4 - EXPLAIN: Write a plain English summary of every 
                change you made.

        Rules:
        - Do not rename any functions
        - Do not change the overall logic
        - Always return valid runnable ${language} code
        - Keep comments short and clear
        - If no bugs found, still refactor and improve code quality

        Return your response in EXACTLY this format:

        FIXED_CODE:
        \`\`\`${language}
        // your fixed code here
        \`\`\`

        EXPLANATION:
        // your plain English explanation here

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
