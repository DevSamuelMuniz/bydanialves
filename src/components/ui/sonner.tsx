import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            "group toast !rounded-2xl !border !shadow-elevated !backdrop-blur-sm",
            "group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground",
            "group-[.toaster]:border-border/60 group-[.toaster]:font-sans",
          ].join(" "),
          title: "!text-sm !font-semibold !leading-snug",
          description: "!text-xs group-[.toast]:text-muted-foreground !leading-relaxed",
          success: "!border-green-500/40 !bg-green-500/10",
          error: "!border-destructive/40 !bg-destructive/10",
          warning: "!border-amber-500/40 !bg-amber-500/10",
          info: "!border-blue-500/40 !bg-blue-500/10",
          actionButton: "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground !rounded-lg !text-xs !font-medium",
          cancelButton: "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground !rounded-lg !text-xs",
          closeButton: "!rounded-lg !border-border/40 hover:!bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
