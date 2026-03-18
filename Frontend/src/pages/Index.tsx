import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CodeInputPanel from "@/components/CodeInputPanel";
import CodeOutputPanel from "@/components/CodeOutputPanel";
import ExplanationCards from "@/components/ExplanationCards";
import Footer from "@/components/Footer";

const MOCK_OUTPUT = `// ✅ Fixed: Missing closing parenthesis
// ✅ Added: Proper spacing and comments
function add(a, b) {
  // Returns the sum of two numbers
  return a + b;
}`;

const MOCK_EXPLANATION = `Bug Found: Missing closing parenthesis on line 1 in the function declaration.

Fix Applied: Added the missing ) to properly close the function parameters.

Refactor: Reformatted code spacing for better readability following standard conventions.

Comment Added: Described the function purpose above the return statement.

Note: All function names were preserved as requested.`;

const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  php: "PHP",
  go: "Go",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  sql: "SQL",
  cpp: "C++",
  ruby: "Ruby",
};

type Status = "idle" | "loading" | "success" | "error";

export default function Index() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [explanation, setExplanation] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = () => {
    if (!code.trim()) return;
    setStatus("loading");
    setOutput("");
    setExplanation("");
    setTimeout(() => {
      setStatus("success");
      setOutput(MOCK_OUTPUT);
      setExplanation(MOCK_EXPLANATION);
    }, 2000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    setCode("");
    setOutput("");
    setExplanation("");
    setStatus("idle");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <HeroSection />

      <main className="flex-1 px-6 pb-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CodeInputPanel
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              loading={status === "loading"}
              onAnalyze={handleAnalyze}
            />
            <CodeOutputPanel
              status={status}
              output={output}
              langLabel={LANG_LABELS[language] || language}
              copied={copied}
              onCopy={handleCopy}
              onReset={handleReset}
            />
          </div>

          <ExplanationCards status={status} explanation={explanation} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
