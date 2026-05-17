import { useMemo } from "react";

interface StarfieldProps {
  count?: number;
  className?: string;
}

export function Starfield({ count = 80, className = "" }: StarfieldProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 4,
      })),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-stardust animate-twinkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
