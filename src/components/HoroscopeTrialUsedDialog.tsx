import { Link } from "@tanstack/react-router";
import { Sparkles, Star, Check, Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function HoroscopeTrialUsedDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-gold/40 bg-secondary/95 backdrop-blur">
        <DialogHeader className="text-center items-center space-y-3">
          <div className="mx-auto size-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
            <Sparkles className="size-7 text-gold" />
          </div>
          <DialogTitle className="font-serif text-2xl shimmer-text">
            Você já viveu o seu período gratuito ✨
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            Que bom te ver por aqui de novo! Esses 7 dias foram só uma amostra do
            que o Universo tem a te contar todas as manhãs. Continue recebendo
            sua leitura diária no WhatsApp — sem pausas, sem perder um dia.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 py-2 text-sm">
          {[
            { i: Star, t: "Sua leitura personalizada todo santo dia" },
            { i: Heart, t: "Comece a manhã alinhado com a energia dos astros" },
            { i: Check, t: "Sem fidelidade — cancele a qualquer momento" },
          ].map(({ i: Icon, t }) => (
            <li key={t} className="flex items-start gap-3">
              <Icon className="size-4 text-gold shrink-0 mt-0.5" />
              <span className="text-foreground/90">{t}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-center text-xs text-muted-foreground">
          Assinantes recebem antes de todo mundo, todos os dias às 8h30.
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            asChild
            size="lg"
            className="w-full bg-gold text-background hover:bg-gold/90 font-semibold"
          >
            <Link to="/horoscopo-assinar">Ver planos de assinatura</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
