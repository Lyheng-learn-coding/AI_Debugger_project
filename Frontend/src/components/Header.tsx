import { Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = ["Debug", "Refactor", "Document"];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left */}
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 gradient-text" style={{ WebkitTextFillColor: 'unset', color: 'hsl(263 70% 58%)' }} />
          <span className="text-lg font-bold tracking-tight">
            CodeFix<span className="text-primary">AI</span>
          </span>
        </div>

        {/* Center */}
        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className="cursor-default border-border bg-secondary/50 text-muted-foreground text-xs font-normal"
            >
              {item}
            </Badge>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-xs text-muted-foreground">Gemini 2.5 Flash</span>
          </div>
          <Button size="sm" className="gradient-violet-blue border-0 text-xs font-medium text-primary-foreground hover:opacity-90">
            Try Now
          </Button>
        </div>
      </div>
    </header>
  );
}
