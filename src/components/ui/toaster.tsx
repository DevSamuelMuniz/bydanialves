import { useToast } from "@/hooks/use-toast";
import {
  Toast, ToastClose, ToastDescription, ToastProvider,
  ToastTitle, ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === "destructive")
    return <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />;
  return <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />;
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant as any} {...props}>
          <ToastIcon variant={variant} />
          <div className="flex-1 min-w-0">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
