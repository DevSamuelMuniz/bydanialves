import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  full_name: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  branch_id: string | null;
  blocked: boolean;
  created_at: string;
  [key: string]: any;
}

let globalAvatarUrl: string | null = null;
const listeners = new Set<(url: string | null) => void>();

function notifyListeners(url: string | null) {
  globalAvatarUrl = url;
  listeners.forEach((fn) => fn(url));
}

export function useAvatarUrl() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(globalAvatarUrl);

  useEffect(() => {
    setAvatarUrl(globalAvatarUrl);
    listeners.add(setAvatarUrl);
    return () => { listeners.delete(setAvatarUrl); };
  }, []);

  return avatarUrl;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(globalAvatarUrl);

  const resolveAvatarUrl = useCallback((path: string | null) => {
    if (!path) {
      notifyListeners(null);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl + "?t=" + Date.now();
    notifyListeners(url);
  }, []);

  useEffect(() => {
    listeners.add(setAvatarUrl);
    return () => { listeners.delete(setAvatarUrl); };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setProfile(data as ProfileData);
      resolveAvatarUrl(data.avatar_url);
    }
    setLoading(false);
  }, [user, resolveAvatarUrl]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!user) return false;
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: filePath })
      .eq("user_id", user.id);
    if (updateError) throw updateError;
    resolveAvatarUrl(filePath);
    return true;
  }, [user, resolveAvatarUrl]);

  return { profile, loading, avatarUrl, fetchProfile, uploadAvatar, setProfile };
}
