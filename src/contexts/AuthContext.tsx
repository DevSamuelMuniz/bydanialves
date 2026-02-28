import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "client";
export type AdminLevel = "attendant" | "professional" | "manager" | "ceo" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  adminLevel: AdminLevel;
  adminBranchId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  adminLevel: null,
  adminBranchId: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(null);
  const [adminBranchId, setAdminBranchId] = useState<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, admin_level, branch_id")
      .eq("user_id", userId);
    if (data && data.length > 0) {
      const isAdmin = data.some((r) => r.role === "admin");
      setUserRole(isAdmin ? "admin" : (data[0].role as UserRole));
      if (isAdmin) {
        const adminRow = data.find((r) => r.role === "admin");
        setAdminLevel((adminRow?.admin_level as AdminLevel) ?? "ceo");
        setAdminBranchId((adminRow as any)?.branch_id ?? null);
      } else {
        setAdminLevel(null);
        setAdminBranchId(null);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserRole(session.user.id), 0);
        } else {
          setUserRole(null);
          setAdminLevel(null);
          setAdminBranchId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setAdminLevel(null);
    setAdminBranchId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, adminLevel, adminBranchId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
