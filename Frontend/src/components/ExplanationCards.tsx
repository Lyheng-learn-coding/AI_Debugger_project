import { motion } from "framer-motion";
import { Bug, CheckCircle, Zap } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "idle" | "loading" | "success" | "error";

interface ParsedExplanation {
  bugs: string[];
  fixes: string[];
  improvements: string[];
}

function parseExplanation(text: string): ParsedExplanation {
  const lines = text.split("\n").filter(Boolean);
  const bugs: string[] = [];
  const fixes: string[] = [];
  const improvements: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Bug Found:")) bugs.push(trimmed.replace("Bug Found: ", ""));
    else if (trimmed.startsWith("Fix Applied:")) fixes.push(trimmed.replace("Fix Applied: ", ""));
    else if (trimmed.startsWith("Refactor:") || trimmed.startsWith("Comment Added:"))
      improvements.push(trimmed.replace(/^(Refactor|Comment Added): /, ""));
    else if (trimmed.startsWith("Note:")) improvements.push(trimmed.replace("Note: ", ""));
  }

  return { bugs, fixes, improvements };
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

interface Props {
  status: Status;
  explanation: string;
}

export default function ExplanationCards({ status, explanation }: Props) {
  const parsed = status === "success" ? parseExplanation(explanation) : null;

  const cards = [
    {
      title: "Bugs Found",
      icon: Bug,
      accent: "text-destructive",
      accentBg: "bg-destructive/10",
      items: parsed?.bugs ?? [],
      count: parsed?.bugs.length ?? 0,
    },
    {
      title: "Fixes Applied",
      icon: CheckCircle,
      accent: "text-success",
      accentBg: "bg-success/10",
      items: parsed?.fixes ?? [],
      count: parsed?.fixes.length ?? 0,
    },
    {
      title: "Improvements",
      icon: Zap,
      accent: "text-primary",
      accentBg: "bg-primary/10",
      items: parsed?.improvements ?? [],
      count: parsed?.improvements.length ?? 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${card.accentBg}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.accent}`} />
                </div>
                <CardTitle className="text-sm">{card.title}</CardTitle>
              </div>
              {status === "success" && (
                <span className={`text-xs font-medium ${card.accent}`}>
                  {card.count} {card.count === 1 ? "item" : "items"}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-[80%] bg-secondary" />
                <Skeleton className="h-3 w-[60%] bg-secondary" />
              </div>
            ) : status === "success" ? (
              <motion.ul {...fadeIn} className="space-y-1.5">
                {card.items.map((item, i) => (
                  <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                    <span className={`mr-1.5 ${card.accent}`}>•</span>
                    {item}
                  </li>
                ))}
                {card.items.length === 0 && (
                  <li className="text-xs text-muted-foreground/50">None detected</li>
                )}
              </motion.ul>
            ) : (
              <p className="text-xs text-muted-foreground/50">Awaiting analysis...</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
