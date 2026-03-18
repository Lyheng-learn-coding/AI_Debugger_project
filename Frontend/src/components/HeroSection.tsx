import { Badge } from "@/components/ui/badge";

export default function HeroSection() {
  return (
    <section className="grid-pattern relative py-16 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="relative space-y-4">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Fix your code{" "}
          <span className="gradient-text">in seconds</span>
        </h1>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground">
          Powered by Gemini AI — Debug, Refactor, and understand your code instantly
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Badge variant="outline" className="border-border bg-secondary/50 text-xs font-normal text-muted-foreground">
            ✦ Free to use
          </Badge>
          <Badge variant="outline" className="border-border bg-secondary/50 text-xs font-normal text-muted-foreground">
            ✦ 13 Languages supported
          </Badge>
        </div>
      </div>
    </section>
  );
}
