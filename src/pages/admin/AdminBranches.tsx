import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Building2, Pencil, Upload, X, ImageIcon, Users } from "lucide-react";
import { AccessDenied } from "@/components/admin/AccessDenied";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
  image_url: string | null;
  staffCount?: number;
  clientCount?: number;
}

export default function AdminBranches() {
  const perms = useAdminPermissions();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const fetchBranches = async () => {
    const [branchesRes, rolesRes, clientsRes] = await Promise.all([
      (supabase.from("branches" as any) as any).select("*").order("created_at"),
      (supabase.from("user_roles") as any).select("branch_id").eq("role", "admin").not("branch_id", "is", null),
      supabase.from("profiles").select("branch_id").not("branch_id", "is", null),
    ]);
    const rawBranches = (branchesRes.data as unknown as Branch[]) || [];
    const roles = (rolesRes.data || []) as { branch_id: string }[];
    const clients = (clientsRes.data || []) as { branch_id: string }[];
    const staffMap: Record<string, number> = {};
    for (const r of roles) {
      if (r.branch_id) staffMap[r.branch_id] = (staffMap[r.branch_id] || 0) + 1;
    }
    const clientMap: Record<string, number> = {};
    for (const c of clients) {
      if (c.branch_id) clientMap[c.branch_id] = (clientMap[c.branch_id] || 0) + 1;
    }
    setBranches(rawBranches.map((b) => ({
      ...b,
      staffCount: staffMap[b.id] || 0,
      clientCount: clientMap[b.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, []);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setAddress("");
    setImageUrl("");
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setName(b.name);
    setAddress(b.address || "");
    setImageUrl(b.image_url || "");
    setImagePreview(b.image_url || null);
    setDialogOpen(true);
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem (JPG, PNG, WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "A imagem deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const fileName = `branch-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("branch-images")
      .upload(fileName, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("branch-images").getPublicUrl(data.path);
      setImageUrl(urlData.publicUrl);
      setImagePreview(urlData.publicUrl);
    }
    setUploadingImage(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    if (editing) {
      const { error } = await (supabase.from("branches" as any) as any)
        .update({ name: name.trim(), address: address.trim() || null, image_url: imageUrl.trim() || null })
        .eq("id", editing.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Filial atualizada!" }); setDialogOpen(false); fetchBranches(); }
    } else {
      const { error } = await (supabase.from("branches" as any) as any)
        .insert({ name: name.trim(), address: address.trim() || null, image_url: imageUrl.trim() || null });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Filial criada!" }); setDialogOpen(false); fetchBranches(); }
    }
    setSaving(false);
  };

  const toggleActive = async (b: Branch) => {
    const { error } = await (supabase.from("branches" as any) as any)
      .update({ active: !b.active })
      .eq("id", b.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchBranches();
  };

  if (!perms.canViewBranches) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl tracking-tight">Filiais</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as unidades da empresa</p>
        </div>
        {perms.canManageBranches && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Filial
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center space-y-3">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhuma filial cadastrada ainda.</p>
            {perms.canManageBranches && (
              <Button onClick={openAdd} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar filial
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
          <Card key={b.id} className={`border-border/60 transition-opacity overflow-hidden ${!b.active ? "opacity-60" : ""}`}>
              {b.image_url && (
                <div className="h-28 overflow-hidden">
                  <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{b.name}</p>
                      {b.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {b.address}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        👤 {b.staffCount ?? 0} funcionário{(b.staffCount ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={b.active
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0"
                    : "bg-muted text-muted-foreground shrink-0"
                  }>
                    {b.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>

                {perms.canManageBranches && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={b.active}
                        onCheckedChange={() => toggleActive(b)}
                        id={`active-${b.id}`}
                      />
                      <Label htmlFor={`active-${b.id}`} className="text-xs text-muted-foreground cursor-pointer">
                        {b.active ? "Ativa" : "Inativa"}
                      </Label>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Editar Filial" : "Nova Filial"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Nome *</Label>
              <Input
                id="branch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Centro, Jardins, Norte..."
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">Endereço</Label>
              <Input
                id="branch-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro..."
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-image">Foto de Fachada</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
              />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border/60">
                  <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageUrl(""); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 h-7 px-3 rounded-full bg-black/60 hover:bg-black/80 flex items-center gap-1.5 text-white text-xs transition-colors"
                  >
                    <Upload className="h-3 w-3" /> Trocar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleImageFile(f);
                  }}
                  className="w-full h-28 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-xs text-muted-foreground">Enviando...</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Clique ou arraste uma foto</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · máx. 5MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
