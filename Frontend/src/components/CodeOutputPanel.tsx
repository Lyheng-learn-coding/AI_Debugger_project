import { CheckCircle, Code, Copy, RotateCcw, Maximize2, Split } from "lucide-react";
import { CSSProperties, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { refractor } from "refractor";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  originalCode: string;
  langLabel: string;
  copied: boolean;
  onCopy: () => void;
  onCopyFull: () => void;
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

function resolveLanguage(language: string) {
  return LANGUAGE_ALIASES[language.toLowerCase()] ?? language.toLowerCase();
}

function extractNodeText(node: any): string {
  if (node.type === "text") return node.value ?? "";
  if (!node.children) return "";
  return node.children.map(extractNodeText).join("");
}

function getTokenStyle(classNames: string[] = []): CSSProperties | undefined {
  const tokens = classNames.filter((className) => className !== "token");
  const styles = tokens
    .flatMap((token) => [
      vscDarkPlus[token as keyof typeof vscDarkPlus],
      vscDarkPlus[`.${token}` as keyof typeof vscDarkPlus],
      vscDarkPlus[tokens.join(".") as keyof typeof vscDarkPlus],
      vscDarkPlus[`.${tokens.join(".")}` as keyof typeof vscDarkPlus],
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

function flattenHighlightNodes(nodes: any[], inheritedStyle?: CSSProperties): StyledTextSegment[] {
  const segments: StyledTextSegment[] = [];

  nodes.forEach((node) => {
    if (node.type === "text") {
      pushStyledSegment(segments, node.value ?? "", inheritedStyle);
      return;
    }

    const nodeStyle = {
      ...(inheritedStyle ?? {}),
      ...(getTokenStyle(node.properties?.className) ?? {}),
    };

    if (node.children?.length) {
      flattenHighlightNodes(node.children, nodeStyle).forEach((segment) => {
        pushStyledSegment(segments, segment.value, segment.style);
      });
      return;
    }

    pushStyledSegment(segments, extractNodeText(node), nodeStyle);
  });

  return segments;
}

function tokenizeLine(line: string, language: string): StyledTextSegment[] {
  if (!line) return [{ value: " " }];

  try {
    const tree = refractor.highlight(line, language);
    const segments = flattenHighlightNodes(tree.children as any[]);
    return segments.length > 0 ? segments : [{ value: line }];
  } catch {
    return [{ value: line }];
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
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
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
}: FullViewModalProps) => {
  const DiffToggle = () => (
    <div className="flex items-center space-x-2 bg-secondary/40 px-3 py-1.5 rounded-full border border-border/50">
      <Split className={`h-3 w-3 ${isDiffMode ? 'text-primary' : 'text-muted-foreground'}`} />
      <Label className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none">Diff View</Label>
      <Switch 
        checked={isDiffMode} 
        onCheckedChange={setIsDiffMode}
        className="data-[state=checked]:bg-primary h-4 w-7"
      />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[80svh] bg-code-bg border-t border-primary/20">
          <DrawerHeader className="flex flex-col gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle>Full Code View</DrawerTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-24 border-border hover:gradient-violet-blue hover:text-primary-foreground shrink-0"
                onClick={onCopy}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="flex justify-center">
              <DiffToggle />
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
  originalCode,
  langLabel,
  copied,
  onCopy,
  onCopyFull,
  onReset,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const isMobile = useIsMobile();
  const hasChanges = originalCode !== output;
  const syntaxLanguage = resolveLanguage(langLabel);

  const diffLines = useMemo(() => {
    if (!isDiffMode || !output || !hasChanges) return [];
    return buildHighlightedDiffLines(computeDiff(originalCode, output));
  }, [hasChanges, isDiffMode, originalCode, output]);

  const CodeBlock = () => (
    <SyntaxHighlighter
      language={langLabel.toLowerCase()}
      style={vscDarkPlus}
      customStyle={{
        background: "transparent",
        margin: 0,
        padding: "1rem",
        fontSize: "0.875rem",
        height: "100%",
      }}
      codeTagProps={{
        style: {
          fontFamily: "'JetBrains Mono', monospace",
        },
      }}
    >
      {output}
    </SyntaxHighlighter>
  );

  const renderSyntaxColoredSegments = (line: HighlightedDiffLine) => {
    const syntaxSegments = tokenizeLine(line.value, syntaxLanguage);
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
            className={segment.type === "added" ? "bg-success/20 rounded-sm" : undefined}
            style={
              segment.type === "added"
                ? { ...(currentSyntaxSegment.style ?? {}), color: "hsl(var(--success))" }
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
    <div className="font-mono text-xs sm:text-sm leading-6 p-4 overflow-auto h-full bg-code-bg">
      {diffLines.map((line, idx) => (
        <div
          key={`${idx}-${line.value}`}
          className={`px-3 rounded-sm mb-1 ${
            line.isEntireLineAdded ? 'bg-success/10' : 'bg-transparent'
          }`}
        >
          <pre className="whitespace-pre-wrap">
            {renderSyntaxColoredSegments(line)}
          </pre>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-violet-blue">
            <CheckCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-base">Fixed Code</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          {status === "success" && hasChanges && (
            <div className="flex items-center space-x-2 bg-secondary/40 px-3 py-1.5 rounded-full border border-border/50">
              <Split className={`h-3.5 w-3.5 ${isDiffMode ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="diff-mode" className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none">Diff View</Label>
              <Switch 
                id="diff-mode" 
                checked={isDiffMode} 
                onCheckedChange={setIsDiffMode}
                className="data-[state=checked]:bg-primary h-4 w-7"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {status === "success" && (
              <>
                <FullViewModal
                  isOpen={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  isMobile={isMobile}
                  onCopy={onCopy}
                  copied={copied}
                  isDiffMode={isDiffMode}
                  setIsDiffMode={setIsDiffMode}
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
                <Badge className="gradient-violet-blue border-0 text-[10px] text-primary-foreground uppercase font-bold tracking-tight px-2">
                  {langLabel}
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "loading" ? (
          <div className="min-h-[350px] space-y-3 rounded-lg border border-border bg-code-bg p-4">
            <Skeleton className="h-4 w-[80%] bg-secondary" />
            <Skeleton className="h-4 w-[60%] bg-secondary" />
            <Skeleton className="h-4 w-[90%] bg-secondary" />
            <Skeleton className="h-4 w-[45%] bg-secondary" />
          </div>
        ) : status === "success" ? (
          <div className="h-[350px] overflow-auto rounded-lg border border-border bg-code-bg">
            <AnimatePresence mode="wait">
              <motion.div
                key={isDiffMode ? 'diff' : 'code'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {isDiffMode && hasChanges ? <DiffBlock /> : <CodeBlock />}
              </motion.div>
            </AnimatePresence>
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
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border hover:gradient-violet-blue hover:border-transparent hover:text-primary-foreground transition-all duration-300"
            disabled={status !== "success"}
            onClick={onCopy}
          >
            <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied!" : "Copy Code"}
          </Button>

          <Button
            variant="ghost"
            className="flex-1 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
            onClick={onReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
