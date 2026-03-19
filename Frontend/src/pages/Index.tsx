import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CodeInputPanel from "@/components/CodeInputPanel";
import CodeOutputPanel from "@/components/CodeOutputPanel";
import ExplanationCards from "@/components/ExplanationCards";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import Particles from "@/components/ui/FloatingAnimation";

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
  html: "HTML",
  css: "CSS",
};

type Status = "idle" | "loading" | "success" | "error";

export default function Index() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [mode, setMode] = useState("Debug");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [explanation, setExplanation] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setStatus("loading");
    setOutput("");
    setExplanation("");

    try {
      const response = await fetch("https://ai-debugger-project-backend.onrender.com/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to analyze code");
      }

      const data = await response.json();
      const result = data.result;

      // --- Safe Parsing Logic ---
      let fixedCode = "AI did not return a valid code block.";
      let explanationPart = result;

      // Preferred format: backend returns labeled response (FIXED_CODE, BUGS_FOUND, etc.)
      const fixedCodeMatch = /FIXED_CODE:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i.exec(
        result,
      );
      if (fixedCodeMatch && fixedCodeMatch[1].trim().length > 0) {
        fixedCode = fixedCodeMatch[1].trim();
      } else {
        // Fallback: parse triple-backtick code block (legacy behavior)
        const codeBlockStart = result.indexOf("```");
        const codeBlockEnd = result.lastIndexOf("```");

        if (codeBlockStart !== -1 && codeBlockEnd > codeBlockStart) {
          const codeBlock = result.substring(codeBlockStart, codeBlockEnd + 3);
          const firstLineEnd = codeBlock.indexOf("\n");
          fixedCode = codeBlock
            .substring(firstLineEnd + 1, codeBlock.length - 3)
            .trim();
        }
      }

      setOutput(fixedCode);
      setExplanation(explanationPart);
      setStatus("success");

      toast({
        title: "Analysis Complete",
        description: "AI has successfully debugged your code.",
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      setStatus("error");
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Could not connect to the backend server.",
      });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyFull = async () => {
    const fullReview = `${output}\n\nExplanation:\n${explanation}`;
    await navigator.clipboard.writeText(fullReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    setCode("");
    setOutput("");
    setExplanation("");
    setStatus("idle");
  };

  const { theme } = useTheme();

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      <Particles
        className="absolute inset-0 z-0"
        quantity={150}
        staticity={30}
        color={theme === "dark" ? "#f59e0b" : "#d97706"}
      />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header currentMode={mode} setMode={setMode} />
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
                onCopyFull={handleCopyFull}
                onReset={handleReset}
              />
            </div>

            <ExplanationCards status={status} explanation={explanation} />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
