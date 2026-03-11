import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatarUrl } from "@/hooks/use-profile";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { User, Settings, LogOut, Moon, Sun, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";

interface AppHeaderProps {
  title: string;
  profilePath: string;
}

export function AppHeader({ title, profilePath }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const avatarUrl = useAvatarUrl();

  const isDark = theme === "dark";
  const toggleDark = () => setTheme(isDark ? "light" : "dark");

  useEffect(() => {
    if (!user) return;
    setProfileEmail(user.email || "");
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
    : "?";

  return (
    <TooltipProvider delayDuration={300}>
      <header className="h-14 flex items-center gap-3 border-b border-border/60 px-4 md:px-6 glass-strong sticky top-0 z-30">
        <SidebarTrigger />

        {/* Search bar */}
        <div id="header-search" className="flex-1">
          <GlobalSearch isAdmin={profilePath.startsWith("/admin")} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Dark mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleDark}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isDark ? "Modo claro" : "Modo escuro"}</TooltipContent>
          </Tooltip>

          {/* Política & Termos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate("/politica-e-termos")}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Política e termos de uso</TooltipContent>
          </Tooltip>

          {/* Notification bell */}
          <NotificationBell />

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button id="header-avatar" className="rounded-full p-0.5 hover:ring-2 hover:ring-primary/40 transition-all ml-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-serif">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="font-semibold text-sm text-foreground truncate">{profileName || "—"}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">{profileEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(profilePath)}>
                <User className="h-4 w-4 mr-2" />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(profilePath)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
