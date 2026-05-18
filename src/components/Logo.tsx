import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Tailwind size class (e.g. "size-8"). Overridden by inline style if width/height passed. */
  sizeClassName?: string;
  /** Animation preset */
  animation?: "spin" | "float" | "pulse" | "orbit" | "none";
  alt?: string;
}

/**
 * Cosmic AI brand logo — golden astrolabe on transparent background.
 * Use everywhere we previously used the Sparkles icon as identity.
 */
export function Logo({
  className,
  sizeClassName = "size-8",
  animation = "float",
  alt = "Cosmic AI",
}: LogoProps) {
  const animationClass =
    animation === "spin"
      ? "animate-logo-spin"
      : animation === "float"
      ? "animate-logo-float"
      : animation === "pulse"
      ? "animate-logo-pulse"
      : animation === "orbit"
      ? "animate-logo-orbit"
      : "";

  return (
    <img
      src={logoUrl}
      alt={alt}
      draggable={false}
      className={cn(
        "select-none object-contain drop-shadow-[0_0_18px_color-mix(in_oklab,var(--gold)_45%,transparent)]",
        sizeClassName,
        animationClass,
        className,
      )}
    />
  );
}

export default Logo;
