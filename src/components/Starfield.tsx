import { useEffect, useMemo, useState } from "react";

interface StarfieldProps {
  count?: number;
  className?: string;
}

// Deterministic PRNG (mulberry32) — same output on server and client,
// avoiding hydration mismatches that would crash the route boundary.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Starfield({ count = 80, className = "" }: StarfieldProps) {
  // SSR-safe: render nothing on the server, mount on the client.
  // Stars are decorative — skipping SSR avoids hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const stars = useMemo(() => {
    const rand = mulberry32(count * 1000 + 7);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      top: rand() * 100,
      left: rand() * 100,
      size: rand() * 1.5 + 0.5,
      delay: rand() * 4,
      duration: 3 + rand() * 4,
    }));
  }, [count]);

  if (!mounted) {
    return <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden />;
  }

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
