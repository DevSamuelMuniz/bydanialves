import { AppHeader } from "@/components/AppHeader";

interface ClientHeaderProps {
  onSearch?: (query: string) => void;
}

export function ClientHeader({ onSearch }: ClientHeaderProps) {
  return (
    <AppHeader
      title="Dani Alves Esmalteria"
      profilePath="/client/profile"
      onSearch={onSearch}
    />
  );
}

