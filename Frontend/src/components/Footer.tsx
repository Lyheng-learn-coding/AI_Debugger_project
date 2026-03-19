import { Bug } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bug className="h-3.5 w-3.5" />
          <span>CodeFix AI</span>
        </div>
        <p className="text-xs text-muted-foreground">Built with Gemini API</p>
      </div>
    </footer>
  );
}
