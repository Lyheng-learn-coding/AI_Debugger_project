import { Code, Wand2, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  {
    value: "html",
    label: "HTML",
    icon: "https://cdn.simpleicons.org/html5/E34F26",
  },
  {
    value: "css",
    label: "CSS",
    icon: "https://cdn.simpleicons.org/css/6b399c",
  },
  {
    value: "javascript",
    label: "JavaScript",
    icon: "https://cdn.simpleicons.org/javascript",
  },
  {
    value: "typescript",
    label: "TypeScript",
    icon: "https://cdn.simpleicons.org/typescript",
  },
  {
    value: "python",
    label: "Python",
    icon: "https://cdn.simpleicons.org/python",
  },
  {
    value: "java",
    label: "Java",
    icon: "https://cdn.simpleicons.org/openjdk/white",
  },
  { value: "csharp", label: "C#", icon: "https://cdn.simpleicons.org/dotnet" },
  { value: "php", label: "PHP", icon: "https://cdn.simpleicons.org/php" },
  { value: "go", label: "Go", icon: "https://cdn.simpleicons.org/go" },
  { value: "swift", label: "Swift", icon: "https://cdn.simpleicons.org/swift" },
  {
    value: "kotlin",
    label: "Kotlin",
    icon: "https://cdn.simpleicons.org/kotlin",
  },
  { value: "dart", label: "Dart", icon: "https://cdn.simpleicons.org/dart" },
  { value: "sql", label: "SQL", icon: "https://cdn.simpleicons.org/mysql" },
  { value: "cpp", label: "C++", icon: "https://cdn.simpleicons.org/cplusplus" },
  { value: "ruby", label: "Ruby", icon: "https://cdn.simpleicons.org/ruby" },
];

interface Props {
  code: string;
  setCode: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  loading: boolean;
  onAnalyze: () => void;
}

export default function CodeInputPanel({
  code,
  setCode,
  language,
  setLanguage,
  loading,
  onAnalyze,
}: Props) {
  return (
    <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-violet-blue">
            <Code className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">Your Code</CardTitle>
            <CardDescription className="text-xs">
              Paste your code below
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                <span className="flex items-center gap-2">
                  <img
                    src={l.icon}
                    alt={l.label}
                    className="h-3.5 w-3.5 object-contain"
                  />
                  <span>{l.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Paste your buggy code here..."
          className="min-h-[350px] resize-none border-border bg-code-bg font-mono text-sm focus-visible:ring-primary"
        />
        <Button
          className="w-full gradient-violet-blue border-0 text-primary-foreground hover:opacity-90"
          onClick={onAnalyze}
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing your
              code...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" /> Analyze & Fix
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
