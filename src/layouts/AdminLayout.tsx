import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <AdminHeader />
          <div className="flex-1 p-4 md:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <WhatsAppButton />
    </SidebarProvider>
  );
}
