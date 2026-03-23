import { useState, useEffect } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CodeInputPanel from "@/components/CodeInputPanel";
import CodeOutputPanel from "@/components/CodeOutputPanel";
import ExplanationCards from "@/components/ExplanationCards";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://ai-debugger-project-backend.onrender.com";

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
  commentedOutput: string;
  explanation: string;
}

interface LastAnalyzedInput {
  code: string;
  errorMessage: string;
  language: string;
  mode: string;
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

const cleanSectionText = (text: string, sectionName: string) =>
  extractSection(text, sectionName)
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\/\/\s*/, "").trim())
    .filter(Boolean)
    .join("\n");

const formatListSection = (text: string, sectionName: string) => {
  const items = extractSection(text, sectionName)
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== "none");

  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "None";
};

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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function createReportSectionHtml(
  title: string,
  body: string,
  options?: { code?: boolean; khmer?: boolean },
) {
  const fontFamily = options?.code
    ? "'JetBrains Mono', monospace"
    : options?.khmer
      ? "'Kantumruy Pro', sans-serif"
      : "Inter, system-ui, sans-serif";

  return `
    <section data-pdf-section="true" style="margin-top: 24px; border: 1px solid #e8dcc6; border-radius: 18px; overflow: hidden; background: #fffdfa;">
      <div style="padding: 14px 18px; background: linear-gradient(90deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08)); border-bottom: 1px solid #f3e6d3;">
        <h2 style="margin: 0; font: 700 18px/1.35 Inter, system-ui, sans-serif; color: #2b2114;">${escapeHtml(title)}</h2>
      </div>
      <div style="padding: 18px;">
        <pre style="margin: 0; white-space: pre-wrap; word-break: break-word; font: 400 ${options?.code ? "13px/1.7" : "15px/1.9"} ${fontFamily}; color: #18120a;">${escapeHtml(body || "(none)")}</pre>
      </div>
    </section>
  `;
}

function createReportHeaderHtml(config: {
  generatedAt: string;
  languageLabel: string;
  mode: string;
}) {
  return `
    <header data-pdf-section="true" style="padding: 24px 28px; border-radius: 24px; background: linear-gradient(135deg, #fff7ed, #fffbeb); border: 1px solid #f3d7a2; box-shadow: 0 10px 35px rgba(32, 20, 7, 0.08);">
      <div style="display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(245,158,11,0.14); color: #b45309; font: 700 12px/1 Inter, system-ui, sans-serif; letter-spacing: 0.08em;">AI DEBUGGER REPORT</div>
      <h1 style="margin: 14px 0 8px; font: 700 32px/1.2 Inter, system-ui, sans-serif; color: #1f160b;">Debug Session Summary</h1>
      <p style="margin: 0; font: 400 15px/1.7 Inter, system-ui, sans-serif; color: #5a4630;">A clean export of your original code, fix result, and explanation.</p>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px;">
        <div style="padding: 14px 16px; border-radius: 16px; background: white; border: 1px solid #eedfc9;">
          <div style="font: 600 11px/1.3 Inter, system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; color: #8b6b47;">Generated</div>
          <div style="margin-top: 8px; font: 500 14px/1.6 Inter, system-ui, sans-serif; color: #1f160b;">${escapeHtml(config.generatedAt)}</div>
        </div>
        <div style="padding: 14px 16px; border-radius: 16px; background: white; border: 1px solid #eedfc9;">
          <div style="font: 600 11px/1.3 Inter, system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; color: #8b6b47;">Language</div>
          <div style="margin-top: 8px; font: 600 15px/1.6 Inter, system-ui, sans-serif; color: #1f160b;">${escapeHtml(config.languageLabel)}</div>
        </div>
        <div style="padding: 14px 16px; border-radius: 16px; background: white; border: 1px solid #eedfc9;">
          <div style="font: 600 11px/1.3 Inter, system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; color: #8b6b47;">Mode</div>
          <div style="margin-top: 8px; font: 600 15px/1.6 Inter, system-ui, sans-serif; color: #1f160b;">${escapeHtml(config.mode)}</div>
        </div>
      </div>
    </header>
  `;
}

function cropCanvasSection(sourceCanvas: HTMLCanvasElement, top: number, height: number) {
  const safeHeight = Math.max(1, Math.min(height, sourceCanvas.height - top));
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = sourceCanvas.width;
  croppedCanvas.height = safeHeight;

  const context = croppedCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create canvas context for PDF export.");
  }

  context.fillStyle = "#f7f3eb";
  context.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
  context.drawImage(
    sourceCanvas,
    0,
    top,
    sourceCanvas.width,
    safeHeight,
    0,
    0,
    croppedCanvas.width,
    safeHeight,
  );

  return {
    imageData: croppedCanvas.toDataURL("image/jpeg", 0.72),
    width: croppedCanvas.width,
    height: croppedCanvas.height,
  };
}

async function capturePdfSections(blocksHtml: string[]) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "860px",
    padding: "0",
    background: "#f7f3eb",
    boxSizing: "border-box",
  });

  wrapper.innerHTML = `<div style="padding: 0; background: #f7f3eb;">${blocksHtml.join("")}</div>`;
  document.body.appendChild(wrapper);

  try {
    const sectionNodes = Array.from(
      wrapper.querySelectorAll<HTMLElement>("[data-pdf-section='true']"),
    );
    const canvas = await html2canvas(wrapper, {
      backgroundColor: null,
      scale: 1.1,
      useCORS: true,
      logging: false,
    });

    const scaleY = canvas.height / wrapper.offsetHeight;

    return sectionNodes.map((sectionNode) => {
      const top = Math.max(0, Math.floor(sectionNode.offsetTop * scaleY));
      const height = Math.max(1, Math.ceil(sectionNode.offsetHeight * scaleY));
      return cropCanvasSection(canvas, top, height);
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}

function addImageBlockToPdf(
  doc: jsPDF,
  imageData: string,
  imagePixelWidth: number,
  imagePixelHeight: number,
  startY: number,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const topMargin = 12;
  const bottomMargin = 12;
  const blockGap = 6;
  const usableWidth = pageWidth - marginX * 2;
  const usablePageHeight = pageHeight - topMargin - bottomMargin;
  const imageHeight = (imagePixelHeight * usableWidth) / imagePixelWidth;

  if (imageHeight <= usablePageHeight) {
    let y = startY;
    if (y + imageHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = topMargin;
    }
    doc.addImage(imageData, "JPEG", marginX, y, usableWidth, imageHeight, undefined, "MEDIUM");
    return y + imageHeight + blockGap;
  }

  if (startY > topMargin) {
    doc.addPage();
  }

  const totalPages = Math.ceil(imageHeight / usablePageHeight);
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    if (pageIndex > 0) {
      doc.addPage();
    }
    const offsetY = topMargin - pageIndex * usablePageHeight;
    doc.addImage(imageData, "JPEG", marginX, offsetY, usableWidth, imageHeight, undefined, "MEDIUM");
  }

  const lastPageHeight =
    imageHeight - usablePageHeight * (totalPages - 1);
  return topMargin + lastPageHeight + blockGap;
}

async function renderReportToPdf(config: {
  fileName: string;
  generatedAt: string;
  languageLabel: string;
  mode: string;
  code: string;
  errorMessage: string;
  output: string;
  commentedOutput: string;
  explanation: string;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const explanationBlocks = [
    {
      title: "Error Summary",
      body:
        cleanSectionText(config.explanation, "ERROR_SUMMARY") ||
        cleanSectionText(config.explanation, "ERROR_SUMMARY_KH"),
    },
    {
      title: "Root Cause",
      body:
        cleanSectionText(config.explanation, "ROOT_CAUSE") ||
        cleanSectionText(config.explanation, "ROOT_CAUSE_KH"),
    },
    {
      title: "Changes Made",
      body:
        formatListSection(config.explanation, "CHANGES_MADE") !== "None"
          ? formatListSection(config.explanation, "CHANGES_MADE")
          : formatListSection(config.explanation, "CHANGES_MADE_KH"),
    },
    {
      title: "Why This Fix Works",
      body:
        cleanSectionText(config.explanation, "WHY_THIS_FIX_WORKS") ||
        cleanSectionText(config.explanation, "WHY_THIS_FIX_WORKS_KH"),
    },
    {
      title: "Alternative Fixes",
      body:
        formatListSection(config.explanation, "ALTERNATIVE_FIXES") !== "None"
          ? formatListSection(config.explanation, "ALTERNATIVE_FIXES")
          : formatListSection(config.explanation, "ALTERNATIVE_FIXES_KH"),
    },
    {
      title: "Prevention Tips",
      body:
        formatListSection(config.explanation, "PREVENTION_TIPS") !== "None"
          ? formatListSection(config.explanation, "PREVENTION_TIPS")
          : formatListSection(config.explanation, "PREVENTION_TIPS_KH"),
    },
    {
      title: "Full Explanation",
      body:
        cleanSectionText(config.explanation, "EXPLANATION_EN") ||
        cleanSectionText(config.explanation, "EXPLANATION_KH") ||
        config.explanation ||
        "(none)",
    },
  ].filter((block) => block.body && block.body.trim().length > 0);

  const blocks = [
    createReportHeaderHtml(config),
    createReportSectionHtml("Original Code", config.code, { code: true }),
    createReportSectionHtml("Error Message / Stack Trace", config.errorMessage || "(none)", {
      code: true,
    }),
    createReportSectionHtml("Fixed Code", config.output, { code: true }),
    ...(config.commentedOutput.trim() && config.commentedOutput !== config.output
      ? [createReportSectionHtml("Fixed Code With Comments", config.commentedOutput, { code: true })]
      : []),
    ...explanationBlocks.map((block) =>
      createReportSectionHtml(block.title, block.body, {
        khmer: /[\u1780-\u17FF]/.test(block.body),
      }),
    ),
  ];

  const capturedSections = await capturePdfSections(blocks);
  let currentY = 12;
  for (const block of capturedSections) {
    currentY = addImageBlockToPdf(
      doc,
      block.imageData,
      block.width,
      block.height,
      currentY,
    );
  }

  doc.save(config.fileName);
}

export default function Index() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [mode, setMode] = useState("Debug");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [commentedOutput, setCommentedOutput] = useState("");
  const [explanation, setExplanation] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lastAnalyzedInput, setLastAnalyzedInput] =
    useState<LastAnalyzedInput | null>(null);

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

  useEffect(() => {
    if (!lastAnalyzedInput || status === "loading") {
      return;
    }

    const hasInputChanged =
      code !== lastAnalyzedInput.code ||
      errorMessage !== lastAnalyzedInput.errorMessage ||
      language !== lastAnalyzedInput.language ||
      mode !== lastAnalyzedInput.mode;

    if (!hasInputChanged) {
      return;
    }

    setOutput("");
    setCommentedOutput("");
    setExplanation("");
    setStatus("idle");
  }, [code, errorMessage, language, lastAnalyzedInput, mode, status]);

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
    setCommentedOutput(item.commentedOutput || item.output);
    setExplanation(item.explanation);
    setStatus("success");
    setLastAnalyzedInput({
      code: item.code,
      errorMessage: item.errorMessage || "",
      language: item.language,
      mode: item.mode,
    });
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
    setCommentedOutput("");
    setExplanation("");

    try {
      const response = await fetch(`${API_BASE_URL}/api`, {
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
      let commentedCode = "";
      let explanationPart = result;
      const bugTypes = parseListSection(result, "BUG_TYPE");
      const changesMade = parseListSection(result, "CHANGES_MADE");
      const noBugFound =
        bugTypes.includes("no-bug-found") ||
        (changesMade.length === 1 && changesMade[0] === "none");

      if (noBugFound) {
        fixedCode = code;
        commentedCode = code;
      } else {
        const fixedCodeSection = extractSection(result, "FIXED_CODE");
        const commentedCodeSection = extractSection(result, "COMMENTED_CODE");
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

        commentedCode = commentedCodeSection.length > 0
          ? commentedCodeSection
          : fixedCode;
      }

      fixedCode = collapseRepeatedOutput(code, fixedCode);
      commentedCode = collapseRepeatedOutput(fixedCode, commentedCode);

      setOutput(fixedCode);
      setCommentedOutput(commentedCode);
      setExplanation(explanationPart);
      setStatus("success");
      setLastAnalyzedInput({
        code,
        errorMessage,
        language,
        mode,
      });

      // Save to history
      addToHistory({
        code,
        errorMessage,
        language,
        mode,
        output: fixedCode,
        commentedOutput: commentedCode,
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

  const handleCopy = async (includeComments = false) => {
    const codeToCopy =
      includeComments && commentedOutput.trim() ? commentedOutput : output;
    await navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = async () => {
    const timestamp = new Date();
    const safeLanguage = (LANG_LABELS[language] || language)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `ai-debugger-report-${safeLanguage || "code"}-${timestamp
      .toISOString()
      .replace(/[:.]/g, "-")}.pdf`;

    await renderReportToPdf({
      fileName,
      generatedAt: timestamp.toLocaleString(),
      languageLabel: LANG_LABELS[language] || language,
      mode,
      code: code || "(none)",
      errorMessage: errorMessage.trim() || "(none)",
      output: output || "(none)",
      commentedOutput,
      explanation: explanation || "(none)",
    });

    toast({
      title: "Report Downloaded",
      description: "Your debug report has been saved as a PDF file.",
    });
  };

  const handleReset = () => {
    setCode("");
    setErrorMessage("");
    setOutput("");
    setCommentedOutput("");
    setExplanation("");
    setStatus("idle");
    setLastAnalyzedInput(null);
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
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <CodeInputPanel
                code={code}
                setCode={setCode}
                errorMessage={errorMessage}
                setErrorMessage={setErrorMessage}
                language={language}
                setLanguage={setLanguage}
                loading={status === "loading"}
                onAnalyze={handleAnalyze}
                onClearCode={handleReset}
              />
              <CodeOutputPanel
                status={status}
                output={output}
                commentedOutput={commentedOutput}
                originalCode={code}
                langLabel={LANG_LABELS[language] || language}
                copied={copied}
                onCopy={handleCopy}
                onDownload={handleDownload}
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
