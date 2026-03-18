import { Code, Wand2, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript", icon: "🟨" },
  { value: "typescript", label: "TypeScript", icon: "🔷" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "csharp", label: "C#", icon: "🔵" },
  { value: "php", label: "PHP", icon: "🐘" },
  { value: "go", label: "Go", icon: "🐹" },
  { value: "swift", label: "Swift", icon: "🍎" },
  { value: "kotlin", label: "Kotlin", icon: "🤖" },
  { value: "dart", label: "Dart", icon: "🎯" },
  { value: "sql", label: "SQL", icon: "🗄️" },
  { value: "cpp", label: "C++", icon: "⚙️" },
  { value: "ruby", label: "Ruby", icon: "💎" },
];

interface Props {
  code: string;
  setCode: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  loading: boolean;
  onAnalyze: () => void;
}

export default function CodeInputPanel({ code, setCode, language, setLanguage, loading, onAnalyze }: Props) {
  return (
    <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-violet-blue">
            <Code className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">Your Code</CardTitle>
            <CardDescription className="text-xs">Paste your code below</CardDescription>
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
                  <span>{l.icon}</span>
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing your code...
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
