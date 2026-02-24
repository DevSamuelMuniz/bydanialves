import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/60 px-4 md:px-6 glass-strong sticky top-0 z-30">
            <SidebarTrigger />
            <h1 className="ml-4 font-serif text-base text-foreground tracking-tight">Painel Administrativo</h1>
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
