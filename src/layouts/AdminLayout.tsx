import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout() {
  const { adminLevel } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <AdminHeader />
          <div className="flex-1 p-4 md:p-8 animate-fade-in overflow-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <WhatsAppButton />
      <OnboardingTour role="admin" adminLevel={adminLevel} />
    </SidebarProvider>
  );
}
