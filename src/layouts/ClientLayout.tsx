import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/client/ClientSidebar";
import { ClientHeader } from "@/components/client/ClientHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { WelcomeModal } from "@/components/client/WelcomeModal";

export default function ClientLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClientSidebar />
        <main className="flex-1 flex flex-col">
          <ClientHeader />
          <div className="flex-1 p-4 md:p-8 animate-fade-in overflow-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <WhatsAppButton />
      <WelcomeModal />
    </SidebarProvider>
  );
}
