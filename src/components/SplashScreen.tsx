import { useEffect, useState } from "react";
import { Logo } from "./Logo";

interface SplashScreenProps {
  onComplete?: () => void;
  minimumDuration?: number;
}

export function SplashScreen({ onComplete, minimumDuration = 4500 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min((elapsed / minimumDuration) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase("exit");
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 800);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [minimumDuration, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-700 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden={phase === "exit"}
    >
      {/* Animated nebula layers */}
      <div className="pointer-events-none absolute inset-0 nebula-bg opacity-70 animate-splash-nebula" />
      <div className="pointer-events-none absolute -inset-1/2 splash-rays animate-splash-rotate" aria-hidden />

      {/* Floating stardust particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-stardust animate-splash-drift"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              width: `${(i % 3) + 1}px`,
              height: `${(i % 3) + 1}px`,
              animationDelay: `${(i % 8) * 0.3}s`,
              animationDuration: `${4 + (i % 5)}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 animate-splash-rise">
        <div className="relative">
          <span className="absolute inset-0 -m-6 rounded-full bg-gold/20 blur-2xl animate-splash-halo" aria-hidden />
          <Logo sizeClassName="size-28" animation="pulse" className="relative" />
        </div>

        <h1 className="font-serif text-4xl italic tracking-wide shimmer-text">
          Código Cósmico
        </h1>

        <p className="text-xs sm:text-sm tracking-micro uppercase text-muted-foreground">
          Onde a sabedoria ancestral encontra o sagrado
        </p>

        <div className="mt-4 w-60">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold via-stardust to-gold bg-[length:200%_100%] animate-splash-shimmer transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
