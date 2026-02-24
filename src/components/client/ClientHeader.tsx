import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientHeaderProps {
  onSearch?: (query: string) => void;
}

export function ClientHeader({ onSearch }: ClientHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfileName(data.full_name || "");
      });
  }, [user]);

  const initials = profileName
    ? profileName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "CL";

  return (
    <header className="h-14 flex items-center gap-3 border-b border-border/60 px-4 md:px-6 glass-strong sticky top-0 z-30">
      <SidebarTrigger />
      <h1 className="font-serif text-base text-foreground tracking-tight hidden md:block">
        Dani Alves Esmalteria
      </h1>

      {/* Search bar */}
      <div className="flex-1 ml-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch?.(e.target.value);
            }}
            className="pl-9 h-9 bg-secondary/50 border-border/40"
          />
        </div>
      </div>

      {/* Settings icon - dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Configurações"
          >
            <Settings className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/client/profile")}>
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="text-destructive">
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile avatar - goes to profile directly */}
      <button
        onClick={() => navigate("/client/profile")}
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-secondary/60 transition-colors"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-serif">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground hidden md:block max-w-[120px] truncate">
          {profileName || "Cliente"}
        </span>
      </button>
    </header>
  );
}
