import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Tailwind size class (e.g. "size-8"). */
  sizeClassName?: string;
  /** Animation preset */
  animation?: "spin" | "float" | "pulse" | "orbit" | "loading" | "none";
  alt?: string;
}

/**
 * Cosmic AI brand logo — golden astrolabe on transparent background.
 */
export function Logo({
  className,
  sizeClassName = "size-8",
  animation = "float",
  alt = "Cosmic AI",
}: LogoProps) {
  const animationClass =
    animation === "spin" || animation === "loading"
      ? "animate-logo-spin"
      : animation === "float"
      ? "animate-logo-float"
      : animation === "pulse"
      ? "animate-logo-pulse"
      : animation === "orbit"
      ? "animate-logo-orbit"
      : "";

  const img = (
    <img
      src={logoUrl}
      alt={alt}
      draggable={false}
      className={cn(
        "select-none object-contain drop-shadow-[0_0_18px_color-mix(in_oklab,var(--gold)_45%,transparent)]",
        sizeClassName,
        animationClass,
        animation !== "loading" && className,
      )}
    />
  );

  if (animation === "loading") {
    return (
      <span
        role="status"
        aria-label="Carregando"
        className={cn("relative inline-grid place-items-center", sizeClassName, className)}
      >
        <span aria-hidden className="logo-loading-ring" />
        {img}
      </span>
    );
  }

  return img;
}

export default Logo;
