import { CheckCircle, Code, Copy, RotateCcw, Maximize2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  langLabel: string;
  copied: boolean;
  onCopy: () => void;
  onCopyFull: () => void;
  onReset: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.7,
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  },
};

export default function CodeOutputPanel({
  status,
  output,
  langLabel,
  copied,
  onCopy,
  onCopyFull,
  onReset,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const handleFullViewCopy = async () => {
    await navigator.clipboard.writeText(output);
    onCopyFull();
  };

  const FullViewModal = ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (isMobile) {
      return (
        <Drawer open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="h-[80svh] bg-code-bg">
            <DrawerHeader>
              <DrawerTitle>Full Code View</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-auto p-4">{children}</div>
          </DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-code-bg">
          <DialogHeader>
            <DialogTitle>Full Code View</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border border-border">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-violet-blue">
            <CheckCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-base">Fixed Code</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {status === "success" && (
            <>
              <FullViewModal
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    title="Full View"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <CodeBlock />
              </FullViewModal>
              <Badge className="gradient-violet-blue border-0 text-xs text-primary-foreground">
                {langLabel}
              </Badge>
            </>
          )}
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
          <div className="h-[350px] overflow-auto rounded-lg border-l-2 border-success bg-code-bg">
            <CodeBlock />
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
            className="flex-1 border-border hover:gradient-violet-blue hover:border-transparent hover:text-primary-foreground"
            disabled={status !== "success"}
            onClick={onCopy}
          >
            <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied!" : "Copy Code"}
          </Button>

          <Button
            variant="ghost"
            className="flex-1 hover:bg-destructive/10 hover:text-destructive"
            onClick={onReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
