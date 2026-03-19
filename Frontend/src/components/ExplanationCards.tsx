import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, CheckCircle, Zap, Languages } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "success" | "error";
type Language = "en" | "kh";

interface ParsedExplanation {
  bugsEn: string[];
  bugsKh: string[];
  fixesEn: string[];
  fixesKh: string[];
  improvementsEn: string[];
  improvementsKh: string[];
  explanationEn: string;
  explanationKh: string;
}

function parseExplanation(text: string): ParsedExplanation {
  const sections = text.split(
    /(BUGS_FOUND:|BUGS_FOUND_KH:|FIXES_APPLIED:|FIXES_APPLIED_KH:|IMPROVEMENTS:|IMPROVEMENTS_KH:|EXPLANATION_EN:|EXPLANATION_KH:)/,
  );

  const result: ParsedExplanation = {
    bugsEn: [],
    bugsKh: [],
    fixesEn: [],
    fixesKh: [],
    improvementsEn: [],
    improvementsKh: [],
    explanationEn: "",
    explanationKh: "",
  };

  const splitLines = (content: string) =>
    content
      .split("\n")
      .map((l) => l.replace(/^- /, "").trim())
      .filter(Boolean);

  for (let i = 1; i < sections.length; i += 2) {
    const header = sections[i];
    const content = sections[i + 1] ? sections[i + 1].trim() : "";

    switch (header) {
      case "BUGS_FOUND:":
        result.bugsEn = splitLines(content);
        break;
      case "BUGS_FOUND_KH:":
        result.bugsKh = splitLines(content);
        break;
      case "FIXES_APPLIED:":
        result.fixesEn = splitLines(content);
        break;
      case "FIXES_APPLIED_KH:":
        result.fixesKh = splitLines(content);
        break;
      case "IMPROVEMENTS:":
        result.improvementsEn = splitLines(content);
        break;
      case "IMPROVEMENTS_KH:":
        result.improvementsKh = splitLines(content);
        break;
      case "EXPLANATION_EN:":
        result.explanationEn = content;
        break;
      case "EXPLANATION_KH:":
        result.explanationKh = content;
        break;
    }
  }

  return result;
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: {
    duration: 0.4,
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  },
};

interface Props {
  status: Status;
  explanation: string;
}

export default function ExplanationCards({ status, explanation }: Props) {
  const [lang, setLang] = useState<Language>("en");
  const parsed = status === "success" ? parseExplanation(explanation) : null;

  const cards = [
    {
      title: lang === "en" ? "Bugs Found" : "បញ្ហាដែលបានរកឃើញ",
      icon: Bug,
      accent: "text-destructive",
      accentBg: "bg-destructive/10",
      items: lang === "en" ? parsed?.bugsEn : parsed?.bugsKh,
    },
    {
      title: lang === "en" ? "Fixes Applied" : "ការកែសម្រួលដែលបានធ្វើ",
      icon: CheckCircle,
      accent: "text-success",
      accentBg: "bg-success/10",
      items: lang === "en" ? parsed?.fixesEn : parsed?.fixesKh,
    },
    {
      title: lang === "en" ? "Improvements" : "ការកែលម្អបន្ថែម",
      icon: Zap,
      accent: "text-primary",
      accentBg: "bg-primary/10",
      items: lang === "en" ? parsed?.improvementsEn : parsed?.improvementsKh,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-wider">
            Analysis Results
          </span>
        </div>
        <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang("en")}
            className={`h-8 px-3 text-sm font-bold rounded-md transition-all ${lang === "en" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            ENGLISH
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang("kh")}
            className={`h-7 px-3 text-sm font-bold rounded-md transition-all font-khmer ${lang === "kh" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            ភាសាខ្មែរ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="transition-transform duration-200 hover:-translate-y-0.5"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${card.accentBg}`}
                >
                  <card.icon className={`h-3.5 w-3.5 ${card.accent}`} />
                </div>
                <CardTitle
                  className={`text-base font-semibold ${lang === "kh" ? "font-khmer leading-relaxed" : ""}`}
                >
                  {card.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {status === "loading" ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-[80%] bg-secondary" />
                  <Skeleton className="h-3 w-[60%] bg-secondary" />
                </div>
              ) : status === "success" ? (
                <AnimatePresence mode="wait">
                  <motion.ul key={lang} {...fadeIn} className="space-y-1.5">
                    {card.items?.map((item, i) => (
                      <li
                        key={i}
                        className={`text-base leading-relaxed text-muted-foreground ${lang === "kh" ? "font-khmer" : ""}`}
                      >
                        <span className={`mr-1.5 ${card.accent}`}>•</span>
                        {item}
                      </li>
                    ))}
                    {(!card.items || card.items.length === 0) && (
                      <li className="text-base text-muted-foreground/50">
                        None detected
                      </li>
                    )}
                  </motion.ul>
                </AnimatePresence>
              ) : (
                <p className="text-sm text-muted-foreground/50">
                  Awaiting analysis...
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {status === "success" && (
        <Card className="transition-transform duration-200 hover:-translate-y-0.5">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle
              className={`text-sm ${lang === "kh" ? "font-khmer leading-relaxed" : ""}`}
            >
              {lang === "en"
                ? "Summary Explanation"
                : "សេចក្តីសង្ខេបនៃការកែសម្រួល"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={lang}
                {...fadeIn}
                className={`text-base leading-relaxed ${lang === "kh" ? "font-khmer" : ""}`}
              >
                {lang === "en" ? parsed?.explanationEn : parsed?.explanationKh}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
