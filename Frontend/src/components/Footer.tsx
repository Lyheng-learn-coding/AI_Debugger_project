import { Bug } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bug className="h-3.5 w-3.5 text-primary" />
          <span className="font-brand text-sm font-bold tracking-[-0.03em] text-foreground">
            <span>
              CodeFix
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                AI
              </span>
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Built with Gemini API</p>
      </div>
    </footer>
  );
}
