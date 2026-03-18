import { CheckCircle, Code, Copy, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  status: Status;
  output: string;
  langLabel: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

export default function CodeOutputPanel({ status, output, langLabel, copied, onCopy, onReset }: Props) {
  return (
    <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-violet-blue">
            <CheckCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-base">Fixed Code</CardTitle>
        </div>
        {status === "success" && (
          <Badge className="gradient-violet-blue border-0 text-xs text-primary-foreground">{langLabel}</Badge>
        )}
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
          <motion.pre
            {...fadeIn}
            className="min-h-[350px] overflow-auto whitespace-pre-wrap rounded-lg border-l-2 border-success bg-code-bg p-4 font-mono text-sm text-foreground"
          >
            {output}
          </motion.pre>
        ) : status === "error" ? (
          <Alert variant="destructive">
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-lg border border-border bg-code-bg p-4">
            <Code className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Your fixed code will appear here...</p>
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
