import { useEffect, useState } from "react";
import { Logo } from "./Logo";

interface SplashScreenProps {
  onComplete?: () => void;
  minimumDuration?: number;
}

export function SplashScreen({ onComplete, minimumDuration = 2200 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const start = performance.now();

    const raf = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min((elapsed / minimumDuration) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(raf);
      } else {
        setPhase("exit");
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 700);
      }
    };
    requestAnimationFrame(raf);
  }, [minimumDuration, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-700 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden={phase === "exit"}
    >
      <div className="relative flex flex-col items-center gap-6">
        <Logo sizeClassName="size-24" animation="pulse" />

        <h1 className="font-serif text-3xl italic tracking-wide shimmer-text">
          Código Cósmico
        </h1>

        <p className="text-sm tracking-micro uppercase text-muted-foreground">
          Onde a inteligência artificial encontra o sagrado
        </p>

        <div className="mt-4 w-56">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-stardust transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 nebula-bg opacity-60" />
    </div>
  );
}
