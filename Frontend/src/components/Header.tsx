import { Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

const navItems = ["Debug", "Refactor"];

interface Props {
  currentMode: string;
  setMode: (mode: string) => void;
}

export default function Header({ currentMode, setMode }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left */}
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">
            CodeFix<span className="text-primary">AI</span>
          </span>
        </div>

        {/* Center */}
        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Badge
              key={item}
              variant={currentMode === item ? "default" : "outline"}
              onClick={() => setMode(item)}
              className={`cursor-pointer transition-all duration-200 ${
                currentMode === item 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item}
            </Badge>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {/* <span className="text-xs text-muted-foreground mr-2">Gemini 2.5 Flash</span> */}
          </div>
          <ThemeToggle />
          {/* <Button
            size="sm"
            className="gradient-violet-blue border-0 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Try Now
          </Button> */}
        </div>
      </div>
    </header>
  );
}
