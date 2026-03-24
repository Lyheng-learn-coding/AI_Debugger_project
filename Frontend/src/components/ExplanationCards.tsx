import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  Languages,
  Lightbulb,
  ListChecks,
  ShieldCheck,
  Square,
  Volume2,
  Wrench,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  | "alternativesPanel"
  | "preventionTabPanel"
  | null;

type SpeakingSection = Exclude<SpeakerId, null>;

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

function voiceNameMatchesHints(
  voice: SpeechSynthesisVoice,
  hints: string[],
) {
  const voiceName = voice.name.toLowerCase();
  return hints.some((hint) => voiceName.includes(hint));
}

function pickPreferredVoice(
  voices: SpeechSynthesisVoice[],
  matcher: (voice: SpeechSynthesisVoice) => boolean,
  preference: VoicePreference,
) {
  const matchingVoices = voices.filter(matcher);

  if (matchingVoices.length === 0) {
    return { voice: null, matchedPreference: false };
  }

  const preferredHints =
    preference === "female" ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS;
  const oppositeHints =
    preference === "female" ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;

  const preferredVoice = matchingVoices.find((voice) =>
    voiceNameMatchesHints(voice, preferredHints),
  );

  if (preferredVoice) {
    return { voice: preferredVoice, matchedPreference: true };
  }

  const neutralVoice = matchingVoices.find(
    (voice) =>
      !voiceNameMatchesHints(voice, preferredHints) &&
      !voiceNameMatchesHints(voice, oppositeHints),
  );

  if (neutralVoice) {
    return { voice: neutralVoice, matchedPreference: false };
  }

  return { voice: null, matchedPreference: false };
}

const DEFAULT_VOICE_PREFERENCES: Record<SpeakingSection, VoicePreference> = {
  errorSummaryCard: "female",
  rootCauseCard: "female",
  changesCard: "female",
  preventionCard: "female",
  whyFixWorksPanel: "female",
  fullExplanationPanel: "female",
  alternativesPanel: "female",
  preventionTabPanel: "female",
};

interface VoiceControlProps {
  speakerId: SpeakingSection;
  text: string;
  lang: Language;
  activeSpeaker: SpeakerId;
  voicePreferences: Record<SpeakingSection, VoicePreference>;
  onToggle: (text: string, language: Language, id: SpeakingSection, voice?: VoicePreference) => void;
  onVoiceChange: (id: SpeakingSection, voice: VoicePreference) => void;
  compact?: boolean;
}

function VoiceControl({
  speakerId,
  text,
  lang,
  activeSpeaker,
  voicePreferences,
  onToggle,
  onVoiceChange,
  compact = false,
}: VoiceControlProps) {
  const currentVoice = voicePreferences[speakerId];
  const isActive = activeSpeaker === speakerId;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        className={
          compact
            ? `h-7 w-7 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`
            : `h-8 gap-2 border-primary/20 ${isActive ? "bg-primary/10 text-primary" : "bg-background"}`
        }
        onClick={() => onToggle(text, lang, speakerId)}
        disabled={!text}
      >
        {isActive ? (
          <>
            <Square className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} fill-current`} />
            {!compact && <span>Stop</span>}
          </>
        ) : (
          <>
            <Volume2 className={compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} />
            {!compact && <span>Listen</span>}
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={compact ? "ghost" : "outline"}
            size={compact ? "icon" : "sm"}
            className={
              compact
                ? "h-7 w-7 text-muted-foreground hover:text-primary"
                : "h-8 border-primary/20 bg-background px-2"
            }
            disabled={!text}
          >
            {!compact && (
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {currentVoice === "female" ? "Woman" : "Man"}
              </span>
            )}
            <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 border-primary/10 bg-background/95 backdrop-blur-md">
          <DropdownMenuLabel className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Voice
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentVoice}
            onValueChange={(value) => {
              const selectedVoice = value as VoicePreference;
              onVoiceChange(speakerId, selectedVoice);
              onToggle(text, lang, speakerId, selectedVoice);
            }}
          >
            <DropdownMenuRadioItem value="female">Woman</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="male">Man</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  items: string[];
  textToSpeak: string;
  lang: Language;
  accentClass: string;
  accentBgClass: string;
  icon: typeof AlertTriangle;
  speakerId: SpeakingSection;
  activeSpeaker: SpeakerId;
  voicePreferences: Record<SpeakingSection, VoicePreference>;
  onSpeak: (
    text: string,
    language: Language,
    id: SpeakingSection,
    voice?: VoicePreference,
  ) => void;
  onVoiceChange: (id: SpeakingSection, voice: VoicePreference) => void;
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
  voicePreferences,
  onSpeak,
  onVoiceChange,
  status,
}: SectionCardProps) {
  return (
    <Card className="transition-all hover:shadow-md border-primary/5 bg-secondary/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${accentBgClass}`}>
            <Icon className={`h-3.5 w-3.5 ${accentClass}`} />
          </div>
          <CardTitle className={`text-sm font-semibold ${lang === "kh" ? "font-khmer text-base leading-7" : ""}`}>
            {title}
          </CardTitle>
        </div>
        {status === "success" && textToSpeak && (
          <VoiceControl
            speakerId={speakerId}
            text={textToSpeak}
            lang={lang}
            activeSpeaker={activeSpeaker}
            voicePreferences={voicePreferences}
            onToggle={onSpeak}
            onVoiceChange={onVoiceChange}
            compact
          />
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
                <li key={`${speakerId}-${index}`} className={`text-sm text-muted-foreground flex gap-2 ${lang === "kh" ? "font-khmer text-base leading-7" : ""}`}>
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
  const [voicePreferences, setVoicePreferences] =
    useState<Record<SpeakingSection, VoicePreference>>(DEFAULT_VOICE_PREFERENCES);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerId>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();
  const isManualSpeechStop = useRef(false);

  const parsed = useMemo(
    () => (status === "success" ? parseExplanation(explanation) : null),
    [status, explanation],
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      isManualSpeechStop.current = true;
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const handleVoiceChange = (id: SpeakingSection, voice: VoicePreference) => {
    setVoicePreferences((prev) => ({
      ...prev,
      [id]: voice,
    }));
  };

  const handleSpeak = (
    text: string,
    language: Language,
    id: SpeakingSection,
    voice = voicePreferences[id],
  ) => {
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

    const isSameSection = activeSpeaker === id;
    const isSameVoice = voicePreferences[id] === voice;

    if (isSameSection && isSameVoice) {
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
    const voices =
      availableVoices.length > 0
        ? availableVoices
        : window.speechSynthesis.getVoices();

    if (language === "kh") {
      utterance.lang = "km-KH";
      const khmerVoiceMatch = pickPreferredVoice(
        voices,
        (voice) =>
          voice.lang.toLowerCase().startsWith("km") ||
          voice.name.toLowerCase().includes("khmer") ||
          voice.lang.toLowerCase().includes("kh"),
        voice,
      );

      if (!khmerVoiceMatch.voice) {
        toast({
          variant: "destructive",
          title:
            voice === "male"
              ? "Male Khmer voice unavailable"
              : "Khmer speech unavailable",
          description:
            voice === "male"
              ? "This device does not have a Khmer male voice installed, so the app cannot switch to a male Khmer voice here."
              : "This device does not have a Khmer voice installed, so Khmer text cannot be read aloud here.",
        });
        return;
      }

      utterance.voice = khmerVoiceMatch.voice;
    } else {
      utterance.lang = "en-US";
      const englishVoiceMatch = pickPreferredVoice(
        voices,
        (voice) => voice.lang.includes("en-US") || voice.lang.includes("en-GB"),
        voice,
      );

      if (!englishVoiceMatch.voice) {
        toast({
          variant: "destructive",
          title:
            voice === "male"
              ? "Male voice unavailable"
              : "Speech unavailable",
          description:
            voice === "male"
              ? "This device does not have a clear English male voice installed, so the app cannot switch to a male voice here."
              : "This device does not have a compatible English voice installed for speech playback.",
        });
        return;
      }

      utterance.voice = englishVoiceMatch.voice;
    }

    utterance.rate = 0.85;
    utterance.onstart = () => {
      isManualSpeechStop.current = false;
      handleVoiceChange(id, voice);
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
  const prevention = parsed ? (lang === "en" ? parsed.preventionEn : parsed.preventionKh) : [];
  const explanationText = parsed ? (lang === "en" ? parsed.explanationEn : parsed.explanationKh) : "";
  const khmerTextClass = lang === "kh" ? "font-khmer text-base leading-7" : "";
  const bugCount = parsed
    ? parsed.bugTypeEn.includes("no-bug-found")
      ? 0
      : Math.max(parsed.errorSummaryEn.length, parsed.bugTypeEn.length, 1)
    : 0;
  const fixCount = parsed ? parsed.changesEn.length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 px-1 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Languages className="h-4 w-4 text-primary" />
          <span className={`text-sm font-semibold tracking-[0.24em] ${lang === "kh" ? khmerTextClass : "uppercase"}`}>
            {lang === "en" ? "Debug Insights" : "ការវិភាគកូដ"}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {status === "success" && confidence && (
            <Badge className={`border border-primary/20 bg-primary/10 text-primary ${khmerTextClass}`}>
              {(lang === "en" ? "Confidence: " : "កម្រិតទំនុកចិត្ត: ") + confidence.replace(/^[-*•]\s*/, "")}
            </Badge>
          )}
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
              className={`h-8 px-4 rounded-md transition-all font-khmer text-base leading-7 ${lang === "kh" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              ភាសាខ្មែរ
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <div className="rounded-2xl border border-primary/10 bg-secondary/10 p-2 shadow-lg shadow-black/10">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-transparent p-0 md:grid-cols-4">
            <TabsTrigger value="analysis" className="justify-start gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bug className="h-4 w-4" />
              <span className={khmerTextClass}>{lang === "en" ? "Analysis" : "វិភាគ"}</span>
            </TabsTrigger>
            <TabsTrigger value="explanation" className="justify-start gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lightbulb className="h-4 w-4" />
              <span className={khmerTextClass}>{lang === "en" ? "Explanation" : "ពន្យល់"}</span>
            </TabsTrigger>
            <TabsTrigger value="alternatives" className="justify-start gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wrench className="h-4 w-4" />
              <span className={khmerTextClass}>{lang === "en" ? "Alternatives" : "ជម្រើសផ្សេង"}</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="justify-start gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ListChecks className="h-4 w-4" />
              <span className={khmerTextClass}>{lang === "en" ? "Summary" : "សង្ខេប"}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analysis" className="mt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                speakerId={card.speakerId as SpeakingSection}
                activeSpeaker={activeSpeaker}
                voicePreferences={voicePreferences}
                onSpeak={handleSpeak}
                onVoiceChange={handleVoiceChange}
                status={status}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="explanation" className="mt-0 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-secondary/10 p-4 shadow-lg shadow-black/10">
            <div>
              <p className={`text-sm font-semibold ${lang === "kh" ? "font-khmer text-base leading-7" : ""}`}>
                {lang === "en" ? "Language Applied Everywhere" : "ភាសាត្រូវបានអនុវត្តទាំងអស់"}
              </p>
              <p className={`mt-1 text-xs text-muted-foreground sm:text-sm ${lang === "kh" ? "font-khmer text-sm leading-7 sm:text-base" : ""}`}>
                {lang === "en"
                  ? "The selected language now applies to analysis, alternatives, and summary too."
                  : "ភាសាដែលបានជ្រើស នឹងអនុវត្តលើផ្ទាំងវិភាគ ជម្រើសផ្សេង និងសង្ខេបផងដែរ។"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`border-primary/20 bg-background/60 px-3 py-1 text-xs font-semibold sm:text-sm ${lang === "kh" ? "font-khmer text-sm leading-7 sm:text-base" : ""}`}
            >
              {lang === "en" ? "Current: English" : "បច្ចុប្បន្ន៖ ភាសាខ្មែរ"}
            </Badge>
          </div>

          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-sm font-semibold ${khmerTextClass}`}>
                {lang === "en" ? "Why This Fix Works" : "ហេតុអ្វីការកែនេះដំណើរការ"}
              </CardTitle>
              <VoiceControl
                speakerId="whyFixWorksPanel"
                text={whyItWorks}
                lang={lang}
                activeSpeaker={activeSpeaker}
                voicePreferences={voicePreferences}
                onToggle={handleSpeak}
                onVoiceChange={handleVoiceChange}
              />
            </CardHeader>
            <CardContent className="pt-6">
              <motion.div
                key={`why-${lang}`}
                {...fadeIn}
                className={`text-base leading-relaxed p-4 rounded-lg bg-background/50 border border-primary/5 ${lang === "kh" ? khmerTextClass : "text-foreground/80"}`}
              >
                {whyItWorks || (lang === "en" ? "No explanation returned." : "មិនមានការពន្យល់ត្រូវបានបង្ហាញទេ។")}
              </motion.div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-sm font-semibold ${khmerTextClass}`}>
                {lang === "en" ? "Full Debug Explanation" : "ការពន្យល់លម្អិតអំពីការកែកំហុស"}
              </CardTitle>
              <VoiceControl
                speakerId="fullExplanationPanel"
                text={explanationText}
                lang={lang}
                activeSpeaker={activeSpeaker}
                voicePreferences={voicePreferences}
                onToggle={handleSpeak}
                onVoiceChange={handleVoiceChange}
              />
            </CardHeader>
            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={lang}
                  {...fadeIn}
                  className={`text-base leading-relaxed p-4 rounded-lg bg-background/50 border border-primary/5 ${lang === "kh" ? khmerTextClass : "text-foreground/80"}`}
                >
                  {explanationText || (lang === "en" ? "No detailed explanation returned." : "មិនមានការពន្យល់លម្អិតត្រូវបានបង្ហាញទេ។")}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alternatives" className="mt-0 space-y-4">
          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-sm font-semibold ${khmerTextClass}`}>
                {lang === "en" ? "Alternative Fixes" : "វិធីកែផ្សេងទៀត"}
              </CardTitle>
              <VoiceControl
                speakerId="alternativesPanel"
                text={alternatives.join(". ")}
                lang={lang}
                activeSpeaker={activeSpeaker}
                voicePreferences={voicePreferences}
                onToggle={handleSpeak}
                onVoiceChange={handleVoiceChange}
              />
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-2 p-4 rounded-lg bg-background/50 border border-primary/5">
                {alternatives.length > 0 ? (
                  alternatives.map((item, index) => (
                    <li
                      key={`alternative-${index}`}
                      className={`text-base leading-7 text-muted-foreground flex gap-2 ${lang === "kh" ? khmerTextClass : ""}`}
                    >
                      <span className="shrink-0 mt-1.5 h-1 w-1 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className={`text-base text-muted-foreground/40 italic ${lang === "kh" ? khmerTextClass : ""}`}>
                    {lang === "en" ? "No alternative fix returned." : "មិនមានវិធីកែផ្សេងទៀតត្រូវបានបង្ហាញទេ។"}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-sm font-semibold ${khmerTextClass}`}>
                {lang === "en" ? "Prevention Tips" : "គន្លឹះការពារ"}
              </CardTitle>
              <VoiceControl
                speakerId="preventionTabPanel"
                text={prevention.join(". ")}
                lang={lang}
                activeSpeaker={activeSpeaker}
                voicePreferences={voicePreferences}
                onToggle={handleSpeak}
                onVoiceChange={handleVoiceChange}
              />
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-2 p-4 rounded-lg bg-background/50 border border-primary/5">
                {prevention.length > 0 ? (
                  prevention.map((item, index) => (
                    <li
                      key={`prevention-${index}`}
                      className={`text-base leading-7 text-muted-foreground flex gap-2 ${lang === "kh" ? khmerTextClass : ""}`}
                    >
                      <span className="shrink-0 mt-1.5 h-1 w-1 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className={`text-base text-muted-foreground/40 italic ${lang === "kh" ? khmerTextClass : ""}`}>
                    {lang === "en" ? "No prevention tips returned." : "មិនមានគន្លឹះការពារត្រូវបានបង្ហាញទេ។"}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-0">
          <Card className="border-primary/10 bg-secondary/10 overflow-hidden shadow-lg">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20">
              <CardTitle className={`text-sm font-semibold ${khmerTextClass}`}>
                {lang === "en" ? "Debug Summary" : "សេចក្តីសង្ខេបការកែកំហុស"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-wrap gap-3">
                {bugType.map((item, index) => (
                  <Badge key={`${item}-${index}`} variant="outline" className={`border-primary/20 bg-background/60 ${khmerTextClass}`}>
                    {item}
                  </Badge>
                ))}
                {confidence && (
                  <Badge className={`border border-primary/20 bg-primary/10 text-primary ${khmerTextClass}`}>
                    {(lang === "en" ? "Confidence: " : "កម្រិតទំនុកចិត្ត: ") + confidence.replace(/^[-*•]\s*/, "")}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className={`font-semibold tracking-[0.2em] text-destructive ${lang === "kh" ? khmerTextClass : "text-xs uppercase"}`}>
                    {lang === "en" ? "Total Bugs Found" : "ចំនួនបញ្ហាសរុប"}
                  </p>
                  <p className={`mt-3 text-3xl font-bold ${lang === "kh" ? "font-khmer text-3xl leading-normal" : ""}`}>{bugCount}</p>
                </div>
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <p className={`font-semibold tracking-[0.2em] text-success ${lang === "kh" ? khmerTextClass : "text-xs uppercase"}`}>
                    {lang === "en" ? "Total Fixes Applied" : "ចំនួនការកែសរុប"}
                  </p>
                  <p className={`mt-3 text-3xl font-bold ${lang === "kh" ? "font-khmer text-3xl leading-normal" : ""}`}>{fixCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
