import { CheckCircle, Code, Copy, RotateCcw, Maximize2, Split } from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const diff: DiffLine[] = [];
  
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({ type: 'equal', value: oldLines[i] });
      i++;
      j++;
    } else {
      if (i < oldLines.length && !newLines.includes(oldLines[i])) {
        diff.push({ type: 'removed', value: oldLines[i] });
        i++;
      } else if (j < newLines.length && !oldLines.includes(newLines[j])) {
        diff.push({ type: 'added', value: newLines[j] });
        j++;
      } else {
        if (i < oldLines.length) {
            diff.push({ type: 'removed', value: oldLines[i] });
            i++;
        }
        if (j < newLines.length) {
            diff.push({ type: 'added', value: newLines[j] });
            j++;
        }
      }
    }
  }
  return diff;
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

  const diffLines = useMemo(() => {
    if (!isDiffMode || !output) return [];
    return computeDiff(originalCode, output);
  }, [isDiffMode, originalCode, output]);

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

  const DiffBlock = () => (
    <div className="font-mono text-xs sm:text-sm leading-6 p-4 overflow-auto h-full bg-code-bg">
      {diffLines.map((line, idx) => (
        <div 
          key={idx} 
          className={`flex px-2 rounded-sm mb-0.5 ${
            line.type === 'added' ? 'bg-success/15 text-success' : 
            line.type === 'removed' ? 'bg-destructive/15 text-destructive line-through opacity-70' : 
            'text-muted-foreground'
          }`}
        >
          <span className="w-6 shrink-0 opacity-50 select-none font-bold">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <pre className="whitespace-pre-wrap flex-1">{line.value || ' '}</pre>
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
          {status === "success" && (
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
                {isDiffMode ? <DiffBlock /> : <CodeBlock />}
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
