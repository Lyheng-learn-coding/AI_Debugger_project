import { Code, Wand2, Loader2, Maximize2 } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

const LANGUAGES = [
  { value: "html", label: "HTML", icon: "https://cdn.simpleicons.org/html5/E34F26" },
  { value: "css", label: "CSS", icon: "https://cdn.simpleicons.org/css/6b399c" },
  { value: "javascript", label: "JavaScript", icon: "https://cdn.simpleicons.org/javascript" },
  { value: "typescript", label: "TypeScript", icon: "https://cdn.simpleicons.org/typescript" },
  { value: "python", label: "Python", icon: "https://cdn.simpleicons.org/python" },
  { value: "java", label: "Java", icon: "https://cdn.simpleicons.org/openjdk/white" },
  { value: "csharp", label: "C#", icon: "https://cdn.simpleicons.org/dotnet" },
  { value: "php", label: "PHP", icon: "https://cdn.simpleicons.org/php" },
  { value: "go", label: "Go", icon: "https://cdn.simpleicons.org/go" },
  { value: "swift", label: "Swift", icon: "https://cdn.simpleicons.org/swift" },
  { value: "kotlin", label: "Kotlin", icon: "https://cdn.simpleicons.org/kotlin" },
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

interface EditorInstanceProps {
  height: string;
  language: string;
  value: string;
  theme: string;
  onChange: (v: string) => void;
}

// Defining EditorInstance outside to prevent re-mounting and loss of focus
const EditorInstance = ({ height, language, value, theme, onChange }: EditorInstanceProps) => (
  <Editor
    height={height}
    language={language}
    value={value}
    theme={theme === "dark" ? "vs-dark" : "light"}
    onChange={(val) => onChange(val || "")}
    options={{
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 16, bottom: 10 },
      fontFamily: "'JetBrains Mono', monospace",
      cursorBlinking: "smooth",
      smoothScrolling: true,
      contextmenu: false,
      lineHeight: 22,
    }}
  />
);

export default function CodeInputPanel({
  code,
  setCode,
  language,
  setLanguage,
  loading,
  onAnalyze,
}: Props) {
  const { theme } = useTheme();
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <>
      <Card className="gradient-border-top glow-violet overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center justify-between">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setIsFullScreen(true)}
            title="Full Screen Editor"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
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
          
          <div className="min-h-[350px] w-full rounded-lg border border-border bg-code-bg overflow-hidden">
            <EditorInstance 
              height="350px" 
              language={language}
              value={code}
              theme={theme || "dark"}
              onChange={setCode}
            />
          </div>

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

      {/* Full Screen Modal Editor */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col bg-code-bg border-primary/20 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-white/5">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                Code Editor
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge className="bg-secondary text-foreground border-border px-3 py-1 font-mono uppercase text-[10px]">
                  {language}
                </Badge>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 p-4 bg-code-bg">
            <div className="h-full rounded-lg border border-white/5 overflow-hidden">
              <EditorInstance 
                height="100%" 
                language={language}
                value={code}
                theme={theme || "dark"}
                onChange={setCode}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
