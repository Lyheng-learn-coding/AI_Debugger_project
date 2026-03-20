import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import {
  AlertTriangle,
  Languages,
  Lightbulb,
  ShieldCheck,
  Square,
  Volume2,
  Wrench,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Status = "idle" | "loading" | "success" | "error";
type Language = "en" | "kh";
type VoicePreference = "female" | "male";
type SpeakerId =
  | "errorSummaryCard"
  | "rootCauseCard"
  | "changesCard"
  | "preventionCard"
  | "whyFixWorksPanel"
  | "fullExplanationPanel"
  | null;

type SectionMap = Record<string, string>;

interface ParsedExplanation {
  errorSummaryEn: string[];
  errorSummaryKh: string[];
  rootCauseEn: string[];
  rootCauseKh: string[];
  bugTypeEn: string[];
  bugTypeKh: string[];
  confidenceEn: string;
  confidenceKh: string;
  changesEn: string[];
  changesKh: string[];
  whyItWorksEn: string;
  whyItWorksKh: string;
  alternativesEn: string[];
  alternativesKh: string[];
  preventionEn: string[];
  preventionKh: string[];
  explanationEn: string;
  explanationKh: string;
}

const SECTION_HEADERS = [
  "ERROR_SUMMARY",
  "ERROR_SUMMARY_KH",
  "ROOT_CAUSE",
  "ROOT_CAUSE_KH",
  "BUG_TYPE",
  "BUG_TYPE_KH",
  "FIX_CONFIDENCE",
  "FIX_CONFIDENCE_KH",
  "FIXED_CODE",
  "CHANGES_MADE",
  "CHANGES_MADE_KH",
  "WHY_THIS_FIX_WORKS",
  "WHY_THIS_FIX_WORKS_KH",
  "ALTERNATIVE_FIXES",
  "ALTERNATIVE_FIXES_KH",
  "PREVENTION_TIPS",
  "PREVENTION_TIPS_KH",
  "EXPLANATION_EN",
  "EXPLANATION_KH",
] as const;

const headerPattern = new RegExp(`(${SECTION_HEADERS.join("|")}):`, "gi");

function parseSections(text: string): SectionMap {
  const sections: SectionMap = {};
  const matches = [...text.matchAll(headerPattern)];

  matches.forEach((match, index) => {
    const key = match[1].toUpperCase();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    sections[key] = text.slice(start, end).trim();
  });

  return sections;
}

function toList(content?: string): string[] {
  if (!content) return [];

  return content
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\/\/\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== "none");
}

function cleanText(content?: string): string {
  return content
    ?.split("\n")
    .map((line) => line.replace(/^\/\/\s*/, "").trim())
    .filter(Boolean)
    .join("\n") || "";
}

function parseExplanation(text: string): ParsedExplanation {
  const sections = parseSections(text);

  return {
    errorSummaryEn: toList(sections.ERROR_SUMMARY),
    errorSummaryKh: toList(sections.ERROR_SUMMARY_KH),
    rootCauseEn: toList(sections.ROOT_CAUSE),
    rootCauseKh: toList(sections.ROOT_CAUSE_KH),
    bugTypeEn: toList(sections.BUG_TYPE),
    bugTypeKh: toList(sections.BUG_TYPE_KH),
    confidenceEn: cleanText(sections.FIX_CONFIDENCE),
    confidenceKh: cleanText(sections.FIX_CONFIDENCE_KH),
    changesEn: toList(sections.CHANGES_MADE),
    changesKh: toList(sections.CHANGES_MADE_KH),
    whyItWorksEn: cleanText(sections.WHY_THIS_FIX_WORKS),
    whyItWorksKh: cleanText(sections.WHY_THIS_FIX_WORKS_KH),
    alternativesEn: toList(sections.ALTERNATIVE_FIXES),
    alternativesKh: toList(sections.ALTERNATIVE_FIXES_KH),
    preventionEn: toList(sections.PREVENTION_TIPS),
    preventionKh: toList(sections.PREVENTION_TIPS_KH),
    explanationEn: cleanText(sections.EXPLANATION_EN) || text,
    explanationKh: cleanText(sections.EXPLANATION_KH),
  };
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

const FEMALE_VOICE_HINTS = [
  "female",
  "woman",
  "zira",
  "hazel",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "ava",
  "aria",
  "jenny",
  "joanna",
  "serena",
  "sonia",
  "susan",
  "zira",
  "zira desktop",
];

const MALE_VOICE_HINTS = [
  "male",
  "man",
  "david",
  "mark",
  "george",
  "daniel",
  "alex",
  "tom",
  "fred",
  "oliver",
  "arthur",
  "guy",
];

function pickPreferredVoice(
  voices: SpeechSynthesisVoice[],
  matcher: (voice: SpeechSynthesisVoice) => boolean,
  preference: VoicePreference,
) {
  const matchingVoices = voices.filter(matcher);

  if (matchingVoices.length === 0) {
    return null;
  }

  const preferredHints =
    preference === "female" ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS;

  const preferredVoice = matchingVoices.find((voice) => {
    const voiceName = voice.name.toLowerCase();
    return preferredHints.some((hint) => voiceName.includes(hint));
  });

  return preferredVoice ?? matchingVoices[0];
}

interface SectionCardProps {
  title: string;
  items: string[];
  textToSpeak: string;
  lang: Language;
  accentClass: string;
  accentBgClass: string;
  icon: typeof AlertTriangle;
  speakerId: SpeakerId;
  activeSpeaker: SpeakerId;
  onSpeak: (text: string, language: Language, id: SpeakerId) => void;
  status: Status;
}

function SectionCard({
  title,
  items,
  textToSpeak,
  lang,
  accentClass,
  accentBgClass,
  icon: Icon,
  speakerId,
  activeSpeaker,
  onSpeak,
  status,
}: SectionCardProps) {
  return (
    <Card className="transition-all hover:shadow-md border-primary/5 bg-secondary/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${accentBgClass}`}>
            <Icon className={`h-3.5 w-3.5 ${accentClass}`} />
          </div>
          <CardTitle className={`text-sm font-semibold ${lang === "kh" ? "font-khmer" : ""}`}>
            {title}
          </CardTitle>
        </div>
        {status === "success" && textToSpeak && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 transition-colors ${activeSpeaker === speakerId ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            onClick={() => onSpeak(textToSpeak, lang, speakerId)}
          >
            {activeSpeaker === speakerId ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full bg-secondary" />
            <Skeleton className="h-3 w-2/3 bg-secondary" />
          </div>
        ) : status === "success" ? (
          <ul className="space-y-1.5">
            {items.length > 0 ? (
              items.map((item, index) => (
                <li key={`${speakerId}-${index}`} className={`text-sm text-muted-foreground flex gap-2 ${lang === "kh" ? "font-khmer" : ""}`}>
                  <span className={`shrink-0 mt-1.5 h-1 w-1 rounded-full ${accentClass.replace("text-", "bg-")}`} />
                  {item}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground/40 italic">None</li>
            )}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">Awaiting analysis...</p>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  status: Status;
  explanation: string;
}

export default function ExplanationCards({ status, explanation }: Props) {
  const [lang, setLang] = useState<Language>("en");
  const [voicePreference, setVoicePreference] = useState<VoicePreference>("female");
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerId>(null);
  const { toast } = useToast();
  const isManualSpeechStop = useRef(false);

  const parsed = useMemo(
    () => (status === "success" ? parseExplanation(explanation) : null),
    [status, explanation],
  );

  useEffect(() => {
    return () => {
      isManualSpeechStop.current = true;
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeak = (text: string, language: Language, id: SpeakerId) => {
    if (!text) return;

    if (!("speechSynthesis" in window)) {
      toast({
        variant: "destructive",
        title: "Speech not supported",
        description:
          language === "kh"
            ? "Your device or browser cannot read Khmer text aloud."
            : "Your device or browser does not support text-to-speech.",
      });
      return;
    }

    if (activeSpeaker === id) {
      isManualSpeechStop.current = true;
      window.speechSynthesis.cancel();
      setActiveSpeaker(null);
      return;
    }

    if (activeSpeaker) {
      isManualSpeechStop.current = true;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (language === "kh") {
      utterance.lang = "km-KH";
      const khmerVoice = pickPreferredVoice(
        voices,
        (voice) =>
          voice.lang.toLowerCase().startsWith("km") ||
          voice.name.toLowerCase().includes("khmer") ||
          voice.lang.toLowerCase().includes("kh"),
        voicePreference,
      );

      if (!khmerVoice) {
        toast({
          variant: "destructive",
          title: "Khmer speech unavailable",
          description:
            "This device does not have a Khmer voice installed, so Khmer text cannot be read aloud here.",
        });
        return;
      }

      utterance.voice = khmerVoice;
    } else {
      utterance.lang = "en-US";
      const englishVoice = pickPreferredVoice(
        voices,
        (voice) => voice.lang.includes("en-US") || voice.lang.includes("en-GB"),
        voicePreference,
      );
      if (englishVoice) utterance.voice = englishVoice;
    }

    utterance.rate = 0.85;
    utterance.onstart = () => {
      isManualSpeechStop.current = false;
      setActiveSpeaker(id);
    };
    utterance.onend = () => {
      isManualSpeechStop.current = false;
      setActiveSpeaker(null);
    };
    utterance.onerror = (event) => {
      setActiveSpeaker(null);

      const isExpectedStop =
        isManualSpeechStop.current ||
        event.error === "interrupted" ||
        event.error === "canceled";

      isManualSpeechStop.current = false;

      if (isExpectedStop) {
        return;
      }

      toast({
        variant: "destructive",
        title: language === "kh" ? "Khmer speech failed" : "Speech failed",
        description:
          language === "kh"
            ? "Your device could not play Khmer text-to-speech."
            : "Your device could not play text-to-speech.",
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const cards = parsed
    ? [
        {
          speakerId: "errorSummaryCard" as SpeakerId,
          title: lang === "en" ? "Error Summary" : "សេចក្តីសង្ខេបបញ្ហា",
          icon: AlertTriangle,
          accentClass: "text-destructive",
          accentBgClass: "bg-destructive/10",
          items: lang === "en" ? parsed.errorSummaryEn : parsed.errorSummaryKh,
          textToSpeak: (lang === "en" ? parsed.errorSummaryEn : parsed.errorSummaryKh).join(". "),
        },
        {
          speakerId: "rootCauseCard" as SpeakerId,
          title: lang === "en" ? "Root Cause" : "មូលហេតុពិត",
          icon: Lightbulb,
          accentClass: "text-amber-500",
          accentBgClass: "bg-amber-500/10",
          items: lang === "en" ? parsed.rootCauseEn : parsed.rootCauseKh,
          textToSpeak: (lang === "en" ? parsed.rootCauseEn : parsed.rootCauseKh).join(". "),
        },
        {
          speakerId: "changesCard" as SpeakerId,
          title: lang === "en" ? "Changes Made" : "ការកែប្រែដែលបានធ្វើ",
          icon: Wrench,
          accentClass: "text-success",
          accentBgClass: "bg-success/10",
          items: lang === "en" ? parsed.changesEn : parsed.changesKh,
          textToSpeak: (lang === "en" ? parsed.changesEn : parsed.changesKh).join(". "),
        },
        {
          speakerId: "preventionCard" as SpeakerId,
          title: lang === "en" ? "Prevention Tips" : "គន្លឹះការពារ",
          icon: ShieldCheck,
          accentClass: "text-primary",
          accentBgClass: "bg-primary/10",
          items: lang === "en" ? parsed.preventionEn : parsed.preventionKh,
          textToSpeak: (lang === "en" ? parsed.preventionEn : parsed.preventionKh).join(". "),
        },
      ]
    : [];

  const bugType = parsed ? (lang === "en" ? parsed.bugTypeEn : parsed.bugTypeKh) : [];
  const confidence = parsed ? (lang === "en" ? parsed.confidenceEn : parsed.confidenceKh) : "";
  const whyItWorks = parsed ? (lang === "en" ? parsed.whyItWorksEn : parsed.whyItWorksKh) : "";
  const alternatives = parsed ? (lang === "en" ? parsed.alternativesEn : parsed.alternativesKh) : [];
  const explanationText = parsed ? (lang === "en" ? parsed.explanationEn : parsed.explanationKh) : "";
  const khmerHeaderFont = lang === "kh" ? "font-khmer" : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1 gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-wider">Debug Analysis</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {status === "success" && bugType.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] tracking-wider text-muted-foreground ${khmerHeaderFont} ${lang === "en" ? "uppercase" : ""}`}>
                {lang === "en" ? "Bug Type" : "ប្រភេទបញ្ហា"}
              </span>
              {bugType.map((item, index) => (
                <Badge
                  key={`${item}-${index}`}
                  variant="outline"
                  className={`border-primary/20 bg-secondary/40 ${khmerHeaderFont}`}
                >
                  {item}
                </Badge>
              ))}
            </div>
          )}
          {status === "success" && confidence && (
            <Badge className={`bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 ${khmerHeaderFont}`}>
              {(lang === "en" ? "Confidence: " : "កម្រិតទំនុកចិត្ត: ") + confidence.replace(/^[-*•]\s*/, "")}
            </Badge>
          )}
          <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoicePreference("female")}
              className={`h-8 px-3 text-xs font-bold rounded-md transition-all ${voicePreference === "female" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              WOMAN
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoicePreference("male")}
              className={`h-8 px-3 text-xs font-bold rounded-md transition-all ${voicePreference === "male" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              MAN
            </Button>
          </div>
          <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang("en")}
              className={`h-8 px-4 text-xs font-bold rounded-md transition-all ${lang === "en" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              ENGLISH
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang("kh")}
              className={`h-8 px-4 text-xs font-bold rounded-md transition-all font-khmer ${lang === "kh" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              ភាសាខ្មែរ
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SectionCard
            key={card.title}
            title={card.title}
            items={card.items}
            textToSpeak={card.textToSpeak}
            lang={lang}
            accentClass={card.accentClass}
            accentBgClass={card.accentBgClass}
            icon={card.icon}
            speakerId={card.speakerId}
            activeSpeaker={activeSpeaker}
            onSpeak={handleSpeak}
            status={status}
          />
        ))}
      </div>

      {status === "success" && parsed && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-xs font-bold uppercase tracking-widest text-primary ${lang === "kh" ? "font-khmer" : ""}`}>
                {lang === "en" ? "Why This Fix Works" : "ហេតុអ្វីការកែនេះដំណើរការ"}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-2 border-primary/20 ${activeSpeaker === "whyFixWorksPanel" ? "bg-primary/10 text-primary" : "bg-background"}`}
                onClick={() => handleSpeak(whyItWorks, lang, "whyFixWorksPanel")}
                disabled={!whyItWorks}
              >
                {activeSpeaker === "whyFixWorksPanel" ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" /> Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" /> Listen
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <motion.div
                key={`why-${lang}`}
                {...fadeIn}
                className={`text-base leading-relaxed p-4 rounded-lg bg-background/50 border border-primary/5 ${lang === "kh" ? "font-khmer text-lg leading-loose" : "text-foreground/80"}`}
              >
                {whyItWorks || (lang === "en" ? "No explanation returned." : "មិនមានការពន្យល់ត្រូវបានបង្ហាញទេ។")}
              </motion.div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20">
              <CardTitle className={`text-xs font-bold uppercase tracking-widest text-primary ${lang === "kh" ? "font-khmer" : ""}`}>
                {lang === "en" ? "Alternative Fixes" : "វិធីកែផ្សេងទៀត"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-2 p-4 rounded-lg bg-background/50 border border-primary/5">
                {alternatives.length > 0 ? (
                  alternatives.map((item, index) => (
                    <li key={`alternative-${index}`} className={`text-sm text-muted-foreground flex gap-2 ${lang === "kh" ? "font-khmer" : ""}`}>
                      <span className="shrink-0 mt-1.5 h-1 w-1 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground/40 italic">
                    {lang === "en" ? "No alternative fix returned." : "មិនមានវិធីកែផ្សេងទៀតត្រូវបានបង្ហាញទេ។"}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {status === "success" && parsed && (
        <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
          <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
            <CardTitle className={`text-xs font-bold uppercase tracking-widest text-primary ${lang === "kh" ? "font-khmer" : ""}`}>
              {lang === "en" ? "Full Debug Explanation" : "ការពន្យល់លម្អិតអំពីការកែកំហុស"}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-2 border-primary/20 ${activeSpeaker === "fullExplanationPanel" ? "bg-primary/10 text-primary" : "bg-background"}`}
              onClick={() => handleSpeak(explanationText, lang, "fullExplanationPanel")}
              disabled={!explanationText}
            >
              {activeSpeaker === "fullExplanationPanel" ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" /> Listen
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={lang}
                {...fadeIn}
                className={`text-base leading-relaxed p-4 rounded-lg bg-background/50 border border-primary/5 ${lang === "kh" ? "font-khmer text-lg leading-loose" : "text-foreground/80"}`}
              >
                {explanationText || (lang === "en" ? "No detailed explanation returned." : "មិនមានការពន្យល់លម្អិតត្រូវបានបង្ហាញទេ។")}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
