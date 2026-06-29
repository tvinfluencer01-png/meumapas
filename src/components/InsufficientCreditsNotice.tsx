import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export function InsufficientCreditsNotice({ message }: { message: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
      <AlertCircle className="size-4 text-gold shrink-0" />
      <span className="text-stardust/90 flex-1">{message}</span>
      <Link
        to="/addons"
        className="rounded-full border border-gold/60 bg-gold/15 px-3 py-1 text-xs uppercase tracking-wider text-gold hover:bg-gold/25"
      >
        Comprar créditos
      </Link>
    </div>
  );
}
