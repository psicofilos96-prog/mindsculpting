import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  title?: string;
  back?: string;
  children: ReactNode;
  className?: string;
}

export function AppShell({ title, back, children, className }: AppShellProps) {
  return (
    <div className="min-h-screen">
      {(title || back) && (
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-lg">
          {back && (
            <Link
              to={back}
              aria-label="Voltar"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          {title && (
            <h1 className="font-display text-lg font-semibold text-foreground">{title}</h1>
          )}
        </header>
      )}
      <main className={cn("mx-auto w-full max-w-md px-4 pb-16 pt-6", className)}>{children}</main>
    </div>
  );
}
