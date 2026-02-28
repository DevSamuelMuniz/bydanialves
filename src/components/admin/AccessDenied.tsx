import { LockKeyhole } from "lucide-react";

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message = "Você não tem permissão para acessar esta página." }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
        <LockKeyhole className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-serif text-lg font-semibold">Acesso Restrito</p>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
