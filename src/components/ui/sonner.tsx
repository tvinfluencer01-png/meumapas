import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-gold/20 group-[.toaster]:shadow-glow group-[.toaster]:rounded-2xl group-[.toaster]:font-sans",
          title: "group-[.toast]:font-serif group-[.toast]:text-stardust",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-gold group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-gold-glow",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toast]:border-gold/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-gold/10 group-[.toast]:to-transparent",
          error:
            "group-[.toast]:border-destructive/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-destructive/10 group-[.toast]:to-transparent",
          warning:
            "group-[.toast]:border-yellow-500/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-yellow-500/10 group-[.toast]:to-transparent",
          info:
            "group-[.toast]:border-sky-500/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-sky-500/10 group-[.toast]:to-transparent",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
