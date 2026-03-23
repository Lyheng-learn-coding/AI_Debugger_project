import { CheckCircle, Code, Copy, Download, RotateCcw, Maximize2, Split, Sparkles } from "lucide-react";
import { CSSProperties, useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { refractor } from "refractor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  status: Status;
  output: string;
  commentedOutput: string;
  originalCode: string;
  langLabel: string;
  copied: boolean;
  onCopy: (includeComments?: boolean) => void;
  onDownload: () => void;
  onReset: () => void;
}

// Simple line-by-line diff engine
interface DiffLine {
  type: 'added' | 'removed' | 'equal';
  value: string;
}

interface DiffSegment {
  type: 'added' | 'removed' | 'equal';
  value: string;
}

interface HighlightedDiffLine {
  value: string;
  segments: DiffSegment[];
  isEntireLineAdded?: boolean;
}

interface StyledTextSegment {
  value: string;
  style?: CSSProperties;
}

const CODE_TEXT_STYLE: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "14px",
  lineHeight: "22px",
  fontWeight: 400,
};

const LOADING_STEPS = [
  "Scanning code structure...",
  "Finding syntax and logic issues...",
  "Generating the safest fix...",
  "Preparing explanation and output...",
];

const LANGUAGE_ALIASES: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  "c#": "csharp",
  csharp: "csharp",
  php: "php",
  go: "go",
  swift: "swift",
  kotlin: "kotlin",
  dart: "dart",
  sql: "sql",
  "c++": "cpp",
  cpp: "cpp",
  ruby: "ruby",
  html: "markup",
  css: "css",
};

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function resolveLanguage(language: string) {
  return LANGUAGE_ALIASES[language.toLowerCase()] ?? language.toLowerCase();
}

function extractNodeText(node: any): string {
  if (node.type === "text") return node.value ?? "";
  if (!node.children) return "";
  return node.children.map(extractNodeText).join("");
}

function extractLineText(segments: StyledTextSegment[]): string {
  return segments.map((segment) => segment.value).join("");
}

function getTokenStyle(
  classNames: string[] = [],
  syntaxTheme: Record<string, CSSProperties>,
): CSSProperties | undefined {
  const tokens = classNames.filter((className) => className !== "token");
  const styles = tokens
    .flatMap((token) => [
      syntaxTheme[token as keyof typeof syntaxTheme],
      syntaxTheme[`.${token}` as keyof typeof syntaxTheme],
      syntaxTheme[tokens.join(".") as keyof typeof syntaxTheme],
      syntaxTheme[`.${tokens.join(".")}` as keyof typeof syntaxTheme],
    ])
    .filter(Boolean);

  if (styles.length === 0) return undefined;

  return Object.assign({}, ...styles) as CSSProperties;
}

function pushStyledSegment(segments: StyledTextSegment[], value: string, style?: CSSProperties) {
  if (!value) return;

  const lastSegment = segments[segments.length - 1];
  if (
    lastSegment &&
    lastSegment.value &&
    JSON.stringify(lastSegment.style ?? {}) === JSON.stringify(style ?? {})
  ) {
    lastSegment.value += value;
    return;
  }

  segments.push({ value, style });
}

function flattenHighlightNodes(
  nodes: any[],
  syntaxTheme: Record<string, CSSProperties>,
  inheritedStyle?: CSSProperties,
): StyledTextSegment[] {
  const segments: StyledTextSegment[] = [];

  nodes.forEach((node) => {
    if (node.type === "text") {
      pushStyledSegment(segments, node.value ?? "", inheritedStyle);
      return;
    }

    const nodeStyle = {
      ...(inheritedStyle ?? {}),
      ...(getTokenStyle(node.properties?.className, syntaxTheme) ?? {}),
    };

    if (node.children?.length) {
      flattenHighlightNodes(node.children, syntaxTheme, nodeStyle).forEach((segment) => {
        pushStyledSegment(segments, segment.value, segment.style);
      });
      return;
    }

    pushStyledSegment(segments, extractNodeText(node), nodeStyle);
  });

  return segments;
}

function splitStyledSegmentsByLine(segments: StyledTextSegment[]): StyledTextSegment[][] {
  const lines: StyledTextSegment[][] = [[]];

  segments.forEach((segment) => {
    const parts = segment.value.split("\n");

    parts.forEach((part, index) => {
      if (part) {
        lines[lines.length - 1].push({
          value: part,
          style: segment.style,
        });
      }

      if (index < parts.length - 1) {
        lines.push([]);
      }
    });
  });

  return lines.map((line) => (line.length > 0 ? line : [{ value: " ", style: undefined }]));
}

function tokenizeCodeByLine(
  code: string,
  language: string,
  syntaxTheme: Record<string, CSSProperties>,
): StyledTextSegment[][] {
  if (!code) return [[{ value: " ", style: undefined }]];

  try {
    const tree = refractor.highlight(code, language);
    const segments = flattenHighlightNodes(tree.children as any[], syntaxTheme);
    return segments.length > 0 ? splitStyledSegmentsByLine(segments) : [[{ value: code }]];
  } catch {
    return code.split("\n").map((line) => [{ value: line || " ", style: undefined }]);
  }
}

function pushSegment(segments: DiffSegment[], type: DiffSegment['type'], value: string) {
  if (!value) return;

  const lastSegment = segments[segments.length - 1];
  if (lastSegment && lastSegment.type === type) {
    lastSegment.value += value;
    return;
  }

  segments.push({ type, value });
}

function computeInlineDiff(oldValue: string, newValue: string) {
  const oldChars = [...oldValue];
  const newChars = [...newValue];
  const lcs: number[][] = Array.from({ length: oldChars.length + 1 }, () =>
    Array(newChars.length + 1).fill(0),
  );

  for (let i = oldChars.length - 1; i >= 0; i -= 1) {
    for (let j = newChars.length - 1; j >= 0; j -= 1) {
      if (oldChars[i] === newChars[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const removedSegments: DiffSegment[] = [];
  const addedSegments: DiffSegment[] = [];

  let i = 0;
  let j = 0;

  while (i < oldChars.length && j < newChars.length) {
    if (oldChars[i] === newChars[j]) {
      pushSegment(removedSegments, 'equal', oldChars[i]);
      pushSegment(addedSegments, 'equal', newChars[j]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      pushSegment(removedSegments, 'removed', oldChars[i]);
      i += 1;
    } else {
      pushSegment(addedSegments, 'added', newChars[j]);
      j += 1;
    }
  }

  while (i < oldChars.length) {
    pushSegment(removedSegments, 'removed', oldChars[i]);
    i += 1;
  }

  while (j < newChars.length) {
    pushSegment(addedSegments, 'added', newChars[j]);
    j += 1;
  }

  return { removedSegments, addedSegments };
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = normalizeLineEndings(oldStr).split('\n');
  const newLines = normalizeLineEndings(newStr).split('\n');
  const diff: DiffLine[] = [];

  let start = 0;
  while (
    start < oldLines.length &&
    start < newLines.length &&
    oldLines[start] === newLines[start]
  ) {
    diff.push({ type: 'equal', value: oldLines[start] });
    start += 1;
  }

  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  const suffix: DiffLine[] = [];

  while (
    oldEnd >= start &&
    newEnd >= start &&
    oldLines[oldEnd] === newLines[newEnd]
  ) {
    suffix.unshift({ type: 'equal', value: oldLines[oldEnd] });
    oldEnd -= 1;
    newEnd -= 1;
  }

  const oldMiddle = oldLines.slice(start, oldEnd + 1);
  const newMiddle = newLines.slice(start, newEnd + 1);

  const lcs: number[][] = Array.from({ length: oldMiddle.length + 1 }, () =>
    Array(newMiddle.length + 1).fill(0),
  );

  for (let i = oldMiddle.length - 1; i >= 0; i -= 1) {
    for (let j = newMiddle.length - 1; j >= 0; j -= 1) {
      if (oldMiddle[i] === newMiddle[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  let i = 0;
  let j = 0;

  while (i < oldMiddle.length && j < newMiddle.length) {
    if (oldMiddle[i] === newMiddle[j]) {
      diff.push({ type: 'equal', value: oldMiddle[i] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      diff.push({ type: 'removed', value: oldMiddle[i] });
      i += 1;
    } else {
      diff.push({ type: 'added', value: newMiddle[j] });
      j += 1;
    }
  }

  while (i < oldMiddle.length) {
    diff.push({ type: 'removed', value: oldMiddle[i] });
    i += 1;
  }

  while (j < newMiddle.length) {
    diff.push({ type: 'added', value: newMiddle[j] });
    j += 1;
  }

  return [...diff, ...suffix];
}

function buildHighlightedDiffLines(diffLines: DiffLine[]): HighlightedDiffLine[] {
  const result: HighlightedDiffLine[] = [];

  let index = 0;

  while (index < diffLines.length) {
    const line = diffLines[index];

    if (line.type === 'equal') {
      result.push({
        value: line.value,
        segments: [{ type: 'equal', value: line.value }],
      });
      index += 1;
      continue;
    }

    if (line.type === 'removed') {
      const removedRun: string[] = [];
      while (index < diffLines.length && diffLines[index].type === 'removed') {
        removedRun.push(diffLines[index].value);
        index += 1;
      }

      const addedRun: string[] = [];
      while (index < diffLines.length && diffLines[index].type === 'added') {
        addedRun.push(diffLines[index].value);
        index += 1;
      }

      const pairedCount = Math.min(removedRun.length, addedRun.length);

      for (let i = 0; i < pairedCount; i += 1) {
        const { addedSegments } = computeInlineDiff(removedRun[i], addedRun[i]);
        result.push({
          value: addedRun[i],
          segments: addedSegments.length > 0 ? addedSegments : [{ type: 'equal', value: addedRun[i] }],
        });
      }

      for (let i = pairedCount; i < addedRun.length; i += 1) {
        result.push({
          value: addedRun[i],
          segments: [{ type: 'added', value: addedRun[i] }],
          isEntireLineAdded: true,
        });
      }

      continue;
    }

    result.push({
      value: line.value,
      segments: [{ type: 'added', value: line.value }],
      isEntireLineAdded: true,
    });
    index += 1;
  }

  return result;
}

interface FullViewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  onCopy: () => void;
  copied: boolean;
  isDiffMode: boolean;
  setIsDiffMode: (v: boolean) => void;
  hasCommentedVersion: boolean;
  showComments: boolean;
  setShowComments: (v: boolean) => void;
}

const FullViewModal = ({
  isOpen,
  onOpenChange,
  isMobile,
  trigger,
  children,
  onCopy,
  copied,
  isDiffMode,
  setIsDiffMode,
  hasCommentedVersion,
  showComments,
  setShowComments,
}: FullViewModalProps) => {
  const toggleContainerClass =
    "flex min-w-0 items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-2 shadow-sm shadow-black/10";
  const toggleLabelClass =
    "cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground";

  const DiffToggle = () => (
    <div className={toggleContainerClass}>
      <Split className={`h-4 w-4 ${isDiffMode ? 'text-primary' : 'text-foreground/80'}`} />
      <Label className={toggleLabelClass}>Diff View</Label>
      <Switch 
        checked={isDiffMode} 
        onCheckedChange={setIsDiffMode}
        className="h-5 w-9 data-[state=checked]:bg-primary"
      />
    </div>
  );

  const CommentsToggle = () => (
    <div
      className={`${toggleContainerClass} ${
        hasCommentedVersion
          ? ""
          : "border-border/40 bg-background/45 opacity-65"
      }`}
    >
      <Code className={`h-4 w-4 ${showComments && hasCommentedVersion ? "text-primary" : "text-foreground/80"}`} />
      <Label className={toggleLabelClass}>Comments</Label>
      <Switch
        checked={showComments}
        onCheckedChange={setShowComments}
        className="h-5 w-9 data-[state=checked]:bg-primary"
        disabled={!hasCommentedVersion}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[80svh] bg-code-bg border-t border-primary/20">
          <DrawerHeader className="flex flex-col gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle>Full Code View</DrawerTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-[96px] border-border px-3 hover:gradient-violet-blue hover:text-primary-foreground shrink-0"
                onClick={onCopy}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="flex justify-center">
              <div className="flex w-full flex-wrap justify-center gap-2">
                <DiffToggle />
                {hasCommentedVersion && <CommentsToggle />}
              </div>
            </div>
          </DrawerHeader>
          <div className="overflow-auto p-4 h-full">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-code-bg border-primary/20 p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-6">
            <DialogTitle>Full Code View</DialogTitle>
            <DiffToggle />
            {hasCommentedVersion && <CommentsToggle />}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-32 border-border hover:gradient-violet-blue hover:text-primary-foreground shrink-0 mr-8"
            onClick={onCopy}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy Code"}
          </Button>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 bg-code-bg">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function CodeOutputPanel({
  status,
  output,
  commentedOutput,
  originalCode,
  langLabel,
  copied,
  onCopy,
  onDownload,
  onReset,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const syntaxLanguage = resolveLanguage(langLabel);
  const syntaxTheme = resolvedTheme === "light" ? oneLight : vscDarkPlus;
  const hasCommentedVersion =
    normalizeLineEndings(commentedOutput).trim().length > 0 &&
    normalizeLineEndings(commentedOutput) !== normalizeLineEndings(output);
  const displayedOutput =
    showComments && hasCommentedVersion ? commentedOutput : output;
  const hasDisplayedChanges =
    normalizeLineEndings(originalCode) !== normalizeLineEndings(displayedOutput);

  const diffLines = useMemo(() => {
    if (!isDiffMode || !displayedOutput || !hasDisplayedChanges) return [];
    return buildHighlightedDiffLines(computeDiff(originalCode, displayedOutput));
  }, [displayedOutput, hasDisplayedChanges, isDiffMode, originalCode]);

  const syntaxLines = useMemo(
    () => tokenizeCodeByLine(displayedOutput, syntaxLanguage, syntaxTheme),
    [displayedOutput, syntaxLanguage, syntaxTheme],
  );
  const loadingProgress = useMemo(() => {
    if (status !== "loading") return 0;
    const elapsed = elapsedMs / 1000;
    const progress =
      14 +
      Math.min(elapsed * 7.5, 30) +
      Math.min(Math.max(elapsed - 3, 0) * 3.2, 18) +
      Math.min(Math.max(elapsed - 8, 0) * 1.8, 12);

    return Math.min(progress, 86);
  }, [elapsedMs, status]);

  useEffect(() => {
    if (status !== "loading") {
      setLoadingStepIndex(0);
      setElapsedSeconds(0);
      setElapsedMs(0);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const seconds = Math.floor(elapsed / 1000);
      setElapsedMs(elapsed);
      setElapsedSeconds(seconds);
      setLoadingStepIndex(Math.min(Math.floor(seconds / 2), LOADING_STEPS.length - 1));
    }, 120);

    return () => window.clearInterval(interval);
  }, [status]);

  const CodeBlock = () => (
    <SyntaxHighlighter
      language={syntaxLanguage}
      style={syntaxTheme}
      customStyle={{
        background: "transparent",
        margin: 0,
        padding: "1rem",
        height: "100%",
        ...CODE_TEXT_STYLE,
      }}
      codeTagProps={{
        style: CODE_TEXT_STYLE,
      }}
    >
      {displayedOutput}
    </SyntaxHighlighter>
  );

  const renderSyntaxColoredSegments = (
    line: HighlightedDiffLine,
    lineIndex: number,
  ) => {
    const syntaxSegments =
      syntaxLines[lineIndex] && extractLineText(syntaxLines[lineIndex]) === line.value
        ? syntaxLines[lineIndex]
        : [{ value: line.value || " ", style: undefined }];
    const rendered: Array<JSX.Element> = [];

    let syntaxIndex = 0;
    let syntaxOffset = 0;
    let renderedIndex = 0;

    line.segments.forEach((segment) => {
      let remaining = segment.value.length;

      if (remaining === 0) {
        return;
      }

      while (remaining > 0 && syntaxIndex < syntaxSegments.length) {
        const currentSyntaxSegment = syntaxSegments[syntaxIndex];
        const available = currentSyntaxSegment.value.length - syntaxOffset;
        const sliceLength = Math.min(remaining, available);
        const sliceValue = currentSyntaxSegment.value.slice(
          syntaxOffset,
          syntaxOffset + sliceLength,
        );

        rendered.push(
          <span
            key={`${line.value}-${renderedIndex}`}
            className={
              segment.type === "added" && !line.isEntireLineAdded
                ? "bg-success/12 shadow-[inset_0_-2px_0_hsl(var(--success)/0.65)]"
                : undefined
            }
            style={
              segment.type === "added"
                ? currentSyntaxSegment.style
                : currentSyntaxSegment.style
            }
          >
            {sliceValue}
          </span>,
        );

        renderedIndex += 1;
        remaining -= sliceLength;
        syntaxOffset += sliceLength;

        if (syntaxOffset >= currentSyntaxSegment.value.length) {
          syntaxIndex += 1;
          syntaxOffset = 0;
        }
      }
    });

    if (rendered.length === 0) {
      rendered.push(
        <span key={`${line.value}-fallback`} style={{ color: "inherit" }}>
          {line.value || " "}
        </span>,
      );
    }

    return rendered;
  };

  const DiffBlock = () => (
    <div
      className="min-h-full bg-code-bg p-4"
      style={CODE_TEXT_STYLE}
    >
      {diffLines.map((line, idx) => (
        <div
          key={`${idx}-${line.value}`}
          className={`px-3 rounded-sm mb-1 ${
            line.isEntireLineAdded
              ? 'bg-success/7 border-l-2 border-success/35'
              : 'bg-transparent'
          }`}
        >
          <pre className="m-0 whitespace-pre" style={CODE_TEXT_STYLE}>
            {renderSyntaxColoredSegments(line, idx)}
          </pre>
        </div>
      ))}
    </div>
  );

  const LoadingBlock = () => (
    <div className="min-h-[350px] rounded-lg border border-border bg-code-bg p-4 sm:p-5">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI is analyzing your code</p>
              <p className="text-xs text-muted-foreground">
                {elapsedSeconds > 0 ? `Working for ${elapsedSeconds}s` : "This can take a little longer for larger code snippets."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-secondary/55">
              <motion.div
                className="relative h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300"
                initial={false}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.14, ease: "linear" }}
              >
                <motion.div
                  className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/75 shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                  animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                />
              </motion.div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground/90">{LOADING_STEPS[loadingStepIndex]}</p>
              <Badge className="border-primary/20 bg-primary/10 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Step {loadingStepIndex + 1}/{LOADING_STEPS.length}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/25 p-4">
          <div className="space-y-3">
            {[82, 58, 74, 66, 46].map((width, index) => (
              <motion.div
                key={width}
                className="relative h-5 overflow-hidden rounded-md bg-secondary/35"
                initial={{ opacity: 0.45 }}
                animate={{ opacity: [0.35, 0.8, 0.35] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: "easeInOut",
                  delay: index * 0.16,
                }}
                style={{ width: `${width}%` }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-primary/35 to-transparent"
                  initial={{ x: "-120%" }}
                  animate={{ x: "160%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.1,
                    ease: "easeInOut",
                    delay: index * 0.14,
                  }}
                  style={{ width: "42%" }}
                />
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LOADING_STEPS.map((step, index) => (
              <div
                key={step}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  index <= loadingStepIndex
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/40 text-muted-foreground"
                }`}
              >
                {step.replace("...", "")}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const toggleContainerClass =
    "flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 shadow-sm shadow-black/10";
  const toggleLabelClass =
    "cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground";

  return (
    <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-violet-blue">
              <CheckCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <CardTitle className="min-w-0 text-base leading-6">Fixed Code</CardTitle>
          </div>
          {status === "success" && (
            <div className="flex shrink-0 items-center gap-2">
              <FullViewModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                isMobile={isMobile}
                onCopy={() => onCopy(showComments)}
                copied={copied}
                isDiffMode={isDiffMode}
                setIsDiffMode={setIsDiffMode}
                hasCommentedVersion={hasCommentedVersion}
                showComments={showComments}
                setShowComments={setShowComments}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                    title="Full View"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <div className="h-full rounded-lg border border-white/5 bg-black/20">
                  {isDiffMode ? <DiffBlock /> : <CodeBlock />}
                </div>
              </FullViewModal>
              <Badge className="hidden gradient-violet-blue border-0 px-2 text-[10px] font-bold uppercase tracking-tight text-primary-foreground sm:inline-flex">
                {langLabel}
              </Badge>
            </div>
          )}
        </div>

        {status === "success" && (
          <div className="flex flex-wrap items-center gap-2">
            {hasDisplayedChanges && (
              <div className={`${toggleContainerClass} border-primary/15 bg-background/70`}>
                <Split className={`h-4 w-4 shrink-0 ${isDiffMode ? 'text-primary' : 'text-foreground/80'}`} />
                <Label htmlFor="diff-mode" className={toggleLabelClass}>Diff View</Label>
                <Switch 
                  id="diff-mode" 
                  checked={isDiffMode} 
                  onCheckedChange={setIsDiffMode}
                  className="h-5 w-9 shrink-0 data-[state=checked]:bg-primary"
                />
              </div>
            )}
            <div className={`${toggleContainerClass} ${
              hasCommentedVersion
                ? "border-primary/15 bg-background/70"
                : "border-border/40 bg-background/45 opacity-65"
            }`}>
              <Code className={`h-4 w-4 shrink-0 ${showComments ? 'text-primary' : 'text-foreground/80'}`} />
              <Label htmlFor="comment-mode" className={toggleLabelClass}>Comments</Label>
              <Switch
                id="comment-mode"
                checked={showComments}
                onCheckedChange={setShowComments}
                className="h-5 w-9 shrink-0 data-[state=checked]:bg-primary"
                disabled={!hasCommentedVersion}
              />
            </div>
            <Badge className="gradient-violet-blue border-0 px-2 text-[10px] font-bold uppercase tracking-tight text-primary-foreground sm:hidden">
              {langLabel}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "loading" ? (
          <LoadingBlock />
        ) : status === "success" ? (
          <div className="h-[350px] overflow-auto rounded-lg border border-border bg-code-bg">
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {isDiffMode && hasDisplayedChanges ? <DiffBlock /> : <CodeBlock />}
            </motion.div>
          </div>
        ) : (
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-lg border border-border bg-code-bg p-4">
            {status === "error" ? (
              <Alert variant="destructive" className="border-0 bg-transparent">
                <AlertDescription>
                  Something went wrong. Please try again.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Code className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Your fixed code will appear here...
                </p>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="border-border hover:gradient-violet-blue hover:border-transparent hover:text-primary-foreground transition-all duration-300"
            disabled={status !== "success"}
            onClick={() => onCopy(showComments)}
          >
            <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied!" : showComments && hasCommentedVersion ? "Copy With Comments" : "Copy Code"}
          </Button>

          <Button
            variant="outline"
            className="border-border hover:gradient-violet-blue hover:border-transparent hover:text-primary-foreground transition-all duration-300"
            disabled={status !== "success"}
            onClick={onDownload}
          >
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>

          <Button
            variant="ghost"
            className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
            onClick={onReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
