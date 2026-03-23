import { Bug, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

const navItems = ["Debug", "Refactor", "ELI5"];

interface Props {
  currentMode: string;
  setMode: (mode: string) => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export default function Header({ currentMode, setMode, onOpenHistory, historyCount }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Bug className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-lg font-bold tracking-tight">
              CodeFix<span className="text-primary">AI</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="relative mr-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenHistory}
              className="relative h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
              title="Recent Fixes"
            >
              <History className="h-5 w-5" />
              {historyCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {historyCount}
                </span>
              )}
            </Button>

            <ThemeToggle />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {navItems.map((item) => (
              <Badge
                key={item}
                variant={currentMode === item ? "default" : "outline"}
                onClick={() => setMode(item)}
                className={`cursor-pointer whitespace-nowrap px-3 py-1 transition-all duration-200 ${
                  currentMode === item 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
