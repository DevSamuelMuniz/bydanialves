import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/client/ClientSidebar";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Sparkles } from "lucide-react";

export default function ClientLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClientSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 flex items-center border-b border-border/60 px-4 md:px-6 glass-strong sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="font-serif text-lg text-foreground tracking-tight">Meu Salão</h1>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <WhatsAppButton />
    </SidebarProvider>
  );
}
