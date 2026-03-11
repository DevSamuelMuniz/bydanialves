import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Calendar, Edit3, Save, Shield, Camera, Loader2, User, Info } from "lucide-react";

export default function AdminProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", bio: "" });

  useEffect(() => {
    if (!user) return;
    supabase.
    from("profiles").
    select("*").
    eq("user_id", user.id).
    single().
    then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name || "", phone: data.phone || "", bio: (data as any).bio || "" });
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
          setAvatarUrl(urlData.publicUrl);
        }
      }
      setLoading(false);
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.
    from("avatars").
    upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { error: updateError } = await supabase.
    from("profiles").
    update({ avatar_url: filePath }).
    eq("user_id", user.id);
    if (updateError) {
      toast({ title: "Erro ao salvar foto", description: updateError.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
      toast({ title: "Foto atualizada! 📸" });
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.
    from("profiles").
    update({ full_name: form.full_name, phone: form.phone, bio: form.bio } as any).
    eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setProfile({ ...profile, ...form });
      setEditing(false);
      toast({ title: "Perfil atualizado! ✨" });
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse w-full">
      <div className="h-52 rounded-xl bg-muted" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 rounded-xl bg-muted" />
        <div className="h-20 rounded-xl bg-muted" />
        <div className="h-20 rounded-xl bg-muted" />
      </div>
    </div>);


  const initials = form.full_name ?
  form.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() :
  "AD";

  const memberSince = profile?.created_at ?
  new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) :
  null;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Meu Perfil</h1>
        <Button
          variant={editing ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
          onClick={() => setEditing(!editing)}>

          <Edit3 className="h-3.5 w-3.5" />
          {editing ? "Cancelar" : "Editar perfil"}
        </Button>
      </div>

      {/* Banner + Avatar card */}
      <Card className="overflow-hidden border-border/60">
        <div className="relative h-40 gradient-gold">
          <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)" }} />

          <div className="absolute top-4 right-4">
            <Badge className="bg-background/80 text-foreground border border-border/60 backdrop-blur-sm gap-1.5">
              <Shield className="h-3 w-3 text-primary" />
              Administrador
            </Badge>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-5">
            {/* Avatar with upload button */}
            <div className="relative group shrink-0">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-elevated">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="gradient-gold text-primary-foreground text-3xl font-serif">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">

                {uploading ?
                <Loader2 className="h-5 w-5 text-white animate-spin" /> :
                <Camera className="h-5 w-5 text-white" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload} />

            </div>
            <div className="mt-12">
              <h2 className="font-serif text-xl font-semibold my-[3px]">{profile?.full_name || "Administrador"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Bio display */}
          {profile?.bio && !editing &&
          <div className="mt-1">
              <Separator className="mb-4" />
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            </div>
          }
        </div>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</p>
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
              <p className="text-sm font-medium">{profile?.phone || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Membro desde</p>
              <p className="text-sm font-medium capitalize">{memberSince || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      {editing &&
      <Card className="border-border/60 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              Editar informações
            </CardTitle>
          </CardHeader>
          <Separator className="mb-0" />
          <CardContent className="pt-5">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome completo
                  </Label>
                  <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Seu nome completo" />

                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Telefone
                  </Label>
                  <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000" />

                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-mail
                </Label>
                <Input value={user?.email || ""} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  Sobre mim
                </Label>
                <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Uma breve descrição sobre você, seu trabalho ou especialidade..."
                className="resize-none min-h-[100px]"
                maxLength={300} />

                <p className="text-xs text-muted-foreground text-right">{form.bio.length}/300</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" className="gap-2" disabled={saving}>
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      }
    </div>);

}