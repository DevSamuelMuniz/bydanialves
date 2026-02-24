import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ShieldCheck } from "lucide-react";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 flex items-center border-b border-border/60 px-4 md:px-6 glass-strong sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h1 className="font-serif text-lg text-foreground tracking-tight">Painel Administrativo</h1>
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
