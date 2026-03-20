import { useState, useEffect } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CodeInputPanel from "@/components/CodeInputPanel";
import CodeOutputPanel from "@/components/CodeOutputPanel";
import ExplanationCards from "@/components/ExplanationCards";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import Particles from "@/components/ui/FloatingAnimation";
import { History, Trash2, Clock, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const LANGUAGE_PATTERNS: Partial<Record<keyof typeof LANG_LABELS, RegExp[]>> = {
  javascript: [
    /\b(const|let|var)\b/,
    /\bconsole\.(log|error|warn)\s*\(/,
    /\bfunction\b/,
    /=>/,
    /\bexport\s+default\b/,
    /\bfrom\s+["']react["']/,
    /\buse(State|Effect|Memo|Ref|Callback)\s*\(/,
    /<([A-Z][A-Za-z0-9]*|div|span|button|input|section|main|header|footer)\b/,
  ],
  typescript: [
    /\binterface\s+\w+/,
    /\btype\s+\w+\s*=/,
    /:\s*(string|number|boolean|any|unknown|void)\b/,
    /\bimplements\b/,
    /\bexport\s+default\b/,
    /\bReact\.(FC|Node|Element)\b/,
    /\buse(State|Effect|Memo|Ref)\s*</,
    /<([A-Z][A-Za-z0-9]*|div|span|button|input|section|main|header|footer)\b/,
  ],
  python: [
    /^\s*def\s+\w+\s*\(/m,
    /^\s*import\s+\w+/m,
    /\bprint\s*\(/,
    /^\s*if\s+.+:\s*$/m,
  ],
  java: [
    /\bpublic\s+class\b/,
    /\bSystem\.out\.println\s*\(/,
    /\bpublic\s+static\s+void\s+main\b/,
    /\bprivate\s+\w+/,
  ],
  csharp: [
    /\busing\s+System\b/,
    /\bConsole\.Write(Line)?\s*\(/,
    /\bnamespace\b/,
    /\bpublic\s+class\b/,
  ],
  php: [
    /<\?php/,
    /\$\w+/,
    /\becho\s+/,
    /\bfunction\s+\w+\s*\(/,
  ],
  go: [
    /\bpackage\s+main\b/,
    /\bfunc\s+\w+\s*\(/,
    /\bfmt\.Print(ln)?\s*\(/,
    /:=/,
  ],
  swift: [
    /\bimport\s+SwiftUI\b/,
    /\bfunc\s+\w+\s*\(/,
    /\blet\s+\w+\s*:/,
    /\bvar\s+\w+\s*:/,
  ],
  kotlin: [
    /\bfun\s+\w+\s*\(/,
    /\bval\s+\w+/,
    /\bvar\s+\w+/,
    /:\s*(Int|String|Boolean|Unit)\b/,
  ],
  dart: [
    /\bvoid\s+main\s*\(/,
    /\bprint\s*\(/,
    /\bfinal\s+\w+/,
    /\bString\b/,
  ],
  sql: [
    /\bSELECT\b/i,
    /\bFROM\b/i,
    /\bWHERE\b/i,
    /\bINSERT\s+INTO\b/i,
  ],
  cpp: [
    /#include\s*<\w+>/,
    /\bstd::/,
    /\bcout\s*<</,
    /\bint\s+main\s*\(/,
  ],
  ruby: [
    /^\s*def\s+\w+/m,
    /\bputs\s+/,
    /^\s*end\s*$/m,
    /@\w+/,
  ],
  html: [
    /<!doctype html>/i,
    /<\/?(html|head|body|title|meta|link|div|span|script|style|p|h1|h2|form|input|button|section|article|main|header|footer)\b/i,
    /<(html|head|body|title|meta|link)\b/i,
  ],
  css: [
    /[.#]?[a-zA-Z][\w-]*\s*\{[^}]*:[^;]+;?/m,
    /@media\b/,
    /\b(color|display|margin|padding|font-size|background)\s*:/,
  ],
};

function getLanguageSignalScore(snippet: string, languageKey: keyof typeof LANG_LABELS) {
  const patterns = LANGUAGE_PATTERNS[languageKey] ?? [];
  return patterns.reduce(
    (score, pattern) => score + (pattern.test(snippet) ? 1 : 0),
    0,
  );
}

function getLikelyLanguageMismatch(snippet: string, selectedLanguage: keyof typeof LANG_LABELS) {
  const scores = (Object.keys(LANG_LABELS) as Array<keyof typeof LANG_LABELS>).map((languageKey) => ({
    language: languageKey,
    score: getLanguageSignalScore(snippet, languageKey),
  }));

  const bestMatch = scores.reduce((best, current) =>
    current.score > best.score ? current : best,
  );
  const selectedScore =
    scores.find(({ language }) => language === selectedLanguage)?.score ?? 0;

  if (
    bestMatch.language !== selectedLanguage &&
    bestMatch.score >= 2 &&
    selectedScore === 0
  ) {
    return bestMatch.language;
  }

  return null;
}

type Status = "idle" | "loading" | "success" | "error";

interface HistoryItem {
  id: string;
  timestamp: number;
  code: string;
  errorMessage: string;
  language: string;
  mode: string;
  output: string;
  explanation: string;
}

const extractSection = (text: string, sectionName: string) => {
  const pattern = new RegExp(
    `${sectionName}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`,
    "i",
  );
  return pattern.exec(text)?.[1]?.trim() || "";
};

const parseListSection = (text: string, sectionName: string) =>
  extractSection(text, sectionName)
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim().toLowerCase())
    .filter(Boolean);

const normalizeForComparison = (value: string) =>
  value.replace(/\r\n/g, "\n").trim();

const collapseRepeatedOutput = (originalCode: string, fixedCode: string) => {
  const normalizedOriginal = normalizeForComparison(originalCode);
  const normalizedFixed = normalizeForComparison(fixedCode);

  if (!normalizedFixed) return fixedCode;
  if (normalizedFixed === normalizedOriginal) return originalCode;

  const doubledWithNewline = `${normalizedOriginal}\n${normalizedOriginal}`;
  const doubledDirect = `${normalizedOriginal}${normalizedOriginal}`;

  if (
    normalizedFixed === doubledWithNewline ||
    normalizedFixed === doubledDirect
  ) {
    return originalCode;
  }

  const fixedLines = normalizedFixed.split("\n");
  if (fixedLines.length % 2 === 0) {
    const half = fixedLines.length / 2;
    const firstHalf = fixedLines.slice(0, half).join("\n").trim();
    const secondHalf = fixedLines.slice(half).join("\n").trim();

    if (
      firstHalf &&
      firstHalf === secondHalf &&
      firstHalf === normalizedOriginal
    ) {
      return originalCode;
    }
  }

  return fixedCode;
};

export default function Index() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [mode, setMode] = useState("Debug");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [explanation, setExplanation] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("ai_debugger_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem("ai_debugger_history", JSON.stringify(history));
  }, [history]);

  const addToHistory = (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    // Keep only last 10 items
    setHistory((prev) => [newItem, ...prev.slice(0, 9)]);
  };

  const clearHistory = () => {
    setHistory([]);
    toast({
      title: "History Cleared",
      description: "All recent fixes have been removed.",
    });
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent loading the item when clicking delete
    setHistory((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: "Item Deleted",
      description: "Analysis removed from history.",
    });
  };

  const loadFromHistory = (item: HistoryItem) => {
    setCode(item.code);
    setErrorMessage(item.errorMessage || "");
    setLanguage(item.language);
    setMode(item.mode);
    setOutput(item.output);
    setExplanation(item.explanation);
    setStatus("success");
    setIsHistoryOpen(false);
    toast({
      title: "History Restored",
      description: `Loaded ${LANG_LABELS[item.language]} snippet from history.`,
    });
  };

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    const normalizedCode = code.trim();

    // ✅ Client-side validation: Check if input looks like code
    const codeKeywords = [
      "function", "const", "let", "var", "if", "for", "while", "class", 
      "import", "export", "return", "async", "await", "try", "catch", 
      "switch", "case", "=>", "{}", "()", "Math.", "print(", "def ", 
      "public", "void", "System.out", "<html", "<div", "SELECT", "FROM", 
      "#include", "printf(", "cout <<", ":=", "func ", "echo ", "puts "
    ];

    const hasKeyword = codeKeywords.some((keyword) =>
      normalizedCode.toLowerCase().includes(keyword.toLowerCase()),
    );
    const hasMinLength = normalizedCode.length > 10;
    const hasCodeSymbol = /[{}();=<>]/.test(normalizedCode);

    if (!hasKeyword && !(hasMinLength && hasCodeSymbol)) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please paste a valid code snippet. This tool only analyzes code.",
      });
      return;
    }

    if (code.length > 5000) {
      toast({
        variant: "destructive",
        title: "Input Too Long",
        description: "Code is too long. Please paste a smaller snippet (max 5000 characters).",
      });
      return;
    }

    if (errorMessage.length > 3000) {
      toast({
        variant: "destructive",
        title: "Error Details Too Long",
        description: "Error message or stack trace is too long. Please shorten it to 3000 characters or less.",
      });
      return;
    }

    const detectedLanguage = getLikelyLanguageMismatch(
      normalizedCode,
      language as keyof typeof LANG_LABELS,
    );

    if (detectedLanguage) {
      toast({
        variant: "destructive",
        title: "Language Mismatch",
        description: `Your code looks like ${LANG_LABELS[detectedLanguage]}, but the dropdown is set to ${LANG_LABELS[language as keyof typeof LANG_LABELS]}. Please select the correct language first.`,
      });
      return;
    }

    setStatus("loading");
    setOutput("");
    setExplanation("");

    try {
      const response = await fetch("https://ai-debugger-project-backend.onrender.com/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, errorMessage, language, mode }),
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
      const bugTypes = parseListSection(result, "BUG_TYPE");
      const changesMade = parseListSection(result, "CHANGES_MADE");
      const noBugFound =
        bugTypes.includes("no-bug-found") ||
        (changesMade.length === 1 && changesMade[0] === "none");

      if (noBugFound) {
        fixedCode = code;
      } else {
        const fixedCodeSection = extractSection(result, "FIXED_CODE");
        if (fixedCodeSection.length > 0) {
          fixedCode = fixedCodeSection;
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
      }

      fixedCode = collapseRepeatedOutput(code, fixedCode);

      setOutput(fixedCode);
      setExplanation(explanationPart);
      setStatus("success");

      // Save to history
      addToHistory({
        code,
        errorMessage,
        language,
        mode,
        output: fixedCode,
        explanation: explanationPart,
      });

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
    setErrorMessage("");
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
        <Header 
          currentMode={mode} 
          setMode={setMode} 
          onOpenHistory={() => setIsHistoryOpen(true)}
          historyCount={history.length}
        />
        
        {/* History Drawer Logic (No Trigger here as it's in the Header) */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="right" className="w-[350px] sm:w-[450px] bg-background/95 backdrop-blur-md border-l border-primary/10">
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <SheetTitle>Recent Fixes</SheetTitle>
                </div>
                {history.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-destructive h-8 px-2 ml-2 bg-secondary/50 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-background/95 backdrop-blur-md border-primary/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your recent fixes from your local storage.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={clearHistory}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </SheetHeader>
            <Separator className="bg-primary/5" />
            
            <ScrollArea className="h-[calc(100vh-140px)] pr-4 mt-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-3">
                  <History className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No history yet. Start debugging!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className="group relative rounded-xl border border-primary/5 bg-secondary/30 p-4 hover:border-primary/30 hover:bg-secondary/50 transition-all duration-300 cursor-pointer overflow-hidden"
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => deleteHistoryItem(e, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col gap-2">                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {LANG_LABELS[item.language] || item.language}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {item.mode}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground line-clamp-2 bg-background/50 p-2 rounded border border-white/5">
                          {item.code.trim().substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-6 pb-12 pt-24">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CodeInputPanel
                code={code}
                setCode={setCode}
                errorMessage={errorMessage}
                setErrorMessage={setErrorMessage}
                language={language}
                setLanguage={setLanguage}
                loading={status === "loading"}
                onAnalyze={handleAnalyze}
              />
              <CodeOutputPanel
                status={status}
                output={output}
                originalCode={code}
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
