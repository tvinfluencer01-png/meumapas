import { useState } from "react";
import { Lamp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SectionLampProps = {
  title: string;
  why: string;
  how: string;
  purpose: string;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Pequena lâmpada piscante exibida ao lado do título de uma sessão.
 * Ao ser clicada, abre um diálogo explicando por que, como usar e para
 * que serve aquela sessão específica.
 */
export function SectionLamp({
  title,
  why,
  how,
  purpose,
  className,
  size = "sm",
}: SectionLampProps) {
  const [open, setOpen] = useState(false);
  const dim = size === "sm" ? "size-6" : "size-7";
  const icon = size === "sm" ? "size-3.5" : "size-4";

  return (
    <>
      <button
        type="button"
        aria-label={`Sobre: ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "relative inline-grid place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 hover:scale-110 transition-all align-middle",
          dim,
          className,
        )}
      >
        <Lamp className={cn(icon, "-rotate-12")} />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full ring-2 ring-gold/50 animate-ping opacity-60 pointer-events-none"
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md glass-card border-gold/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-gold">
              <Lamp className="size-5 -rotate-12" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-stardust">
              Entenda esta sessão: por quê, como usar e para que serve.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4 text-sm leading-relaxed">
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Por quê
              </h3>
              <p className="text-foreground/90">{why}</p>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Como usar
              </h3>
              <p className="text-foreground/90">{how}</p>
            </section>
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-gold/80 mb-1">
                Para que serve
              </h3>
              <p className="text-foreground/90">{purpose}</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
