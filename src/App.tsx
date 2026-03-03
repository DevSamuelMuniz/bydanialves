import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ClientLayout from "./layouts/ClientLayout";
import AdminLayout from "./layouts/AdminLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import NewBooking from "./pages/client/NewBooking";
import ClientHistory from "./pages/client/ClientHistory";
import ClientPendingAppointments from "./pages/client/ClientPendingAppointments";
import ClientProfile from "./pages/client/ClientProfile";
import ClientPlans from "./pages/client/ClientPlans";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminAgenda from "./pages/admin/AdminAgenda";
import AdminMyAppointments from "./pages/admin/AdminMyAppointments";
import AdminServices from "./pages/admin/AdminServices";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminCoupons from "./pages/admin/AdminCoupons";
import TermosDeServico from "./pages/TermosDeServico";
import PoliticaDePrivacidade from "./pages/PoliticaDePrivacidade";
import PoliticaETermos from "./pages/PoliticaETermos";
import LandingPage from "./pages/LandingPage";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/login" element={<Navigate to="/auth" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/termosdeservico" element={<TermosDeServico />} />
            <Route path="/politicadeprivacidade" element={<PoliticaDePrivacidade />} />
            <Route path="/politica-e-termos" element={<PoliticaETermos />} />

            {/* Client routes */}
            <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientLayout /></ProtectedRoute>}>
              <Route index element={<ClientDashboard />} />
              <Route path="booking" element={<NewBooking />} />
              <Route path="pending" element={<ClientPendingAppointments />} />
              <Route path="history" element={<ClientHistory />} />
              <Route path="plans" element={<ClientPlans />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="agenda" element={<AdminAgenda />} />
              <Route path="my-appointments" element={<AdminMyAppointments />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="branches" element={<AdminBranches />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="logs" element={<AdminLogs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
