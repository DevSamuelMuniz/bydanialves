import { AppHeader } from "@/components/AppHeader";

interface AdminHeaderProps {
  onSearch?: (query: string) => void;
}

export function AdminHeader({ onSearch }: AdminHeaderProps) {
  return (
    <AppHeader
      title="Painel Administrativo"
      profilePath="/admin/profile"
      onSearch={onSearch}
    />
  );
}

