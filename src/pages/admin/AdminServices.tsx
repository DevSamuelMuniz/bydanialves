import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Clock, DollarSign, FileText, Upload, Sparkles, ImageIcon, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function AdminServices() {
  const { toast } = useToast();
  const { canManageServices } = useAdminPermissions();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "60" });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    const list = data || [];
    setServices(list);
    setLoading(false);
    return list;
  };

  // Auto-generate images for services without one on load
  useEffect(() => {
    fetchServices().then((list) => {
      const missing = list.filter((s) => !s.image_url);
      if (missing.length > 0) autoGenerateAll();
    });
  }, []);

  const autoGenerateAll = async () => {
    setAutoGenerating(true);
    try {
      await supabase.functions.invoke("generate-service-images", { body: {} });
      await fetchServices();
    } catch (e) {
      console.error("Auto-generate failed", e);
    } finally {
      setAutoGenerating(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setPreviewImage(null);
    setForm({ name: "", description: "", price: "", duration_minutes: "60" });
    setDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setPreviewImage(s.image_url || null);
    setForm({ name: s.name, description: s.description || "", price: String(s.price), duration_minutes: String(s.duration_minutes) });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
    };
    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "Serviço atualizado!" : "Serviço criado!" });
    setDialogOpen(false);
    fetchServices();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `services/${editing.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("service-images").upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("service-images").getPublicUrl(filePath);
      const url = pub.publicUrl + `?t=${Date.now()}`;
      await supabase.from("services").update({ image_url: url }).eq("id", editing.id);
      setPreviewImage(url);
      setEditing({ ...editing, image_url: url });
      toast({ title: "Imagem atualizada!" });
      fetchServices();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!editing) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-service-images", {
        body: { serviceId: editing.id, serviceName: editing.name || form.name },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.url) {
        setPreviewImage(result.url);
        setEditing({ ...editing, image_url: result.url });
        toast({ title: "Imagem gerada com IA!" });
        fetchServices();
      } else {
        throw new Error("Falha ao gerar imagem");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("services").update({ active }).eq("id", id);
    fetchServices();
  };

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl">Gestão de Serviços</h1>
          {autoGenerating && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Gerando imagens...
            </div>
          )}
        </div>
        {canManageServices && (
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo Serviço</Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((s) => (
          <Card key={s.id} className={`border-border/40 hover:border-primary/30 transition-all duration-200 overflow-hidden ${!s.active ? "opacity-50" : ""}`}>
            {/* Cover image */}
            <div className="relative aspect-video bg-muted overflow-hidden">
              {s.image_url ? (
                <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              {/* Active toggle + edit overlaid */}
              {!s.is_system && canManageServices && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                  <Switch checked={s.active} onCheckedChange={(v) => toggleActive(s.id, v)} className="scale-75" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {s.is_system && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-muted-foreground italic">Padrão</span>
                </div>
              )}
            </div>

            <CardContent className="p-4 flex flex-col gap-2">
              <p className="font-semibold text-sm leading-snug">{s.name}</p>

              {s.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {s.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/30">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{s.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <span>R$ {Number(s.price).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Editar" : "Novo"} Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o serviço, o que inclui, benefícios..."
                rows={2}
              />
            </div>

            {/* Image section — only for existing services */}
            {editing && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Imagem de capa</Label>
                {previewImage ? (
                  <div className="relative rounded-lg overflow-hidden h-36 bg-muted">
                    <img src={previewImage} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                      <Button size="sm" variant="secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                        <Upload className="h-3.5 w-3.5 mr-1" />Trocar
                      </Button>
                      <Button size="sm" variant="secondary" type="button" onClick={handleGenerateAI} disabled={generatingAI}>
                        {generatingAI ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}IA
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                      {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload
                    </Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={handleGenerateAI} disabled={generatingAI}>
                      {generatingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Gerar com IA
                    </Button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} required /></div>
            </div>
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
