import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { translateError } from "@/lib/utils";
import { Loader2, Copy, ExternalLink, QrCode, Barcode, CreditCard, CheckCircle2 } from "lucide-react";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string | null;
  planName?: string;
  planPrice?: number;
  onSuccess?: () => void;
}

export function AsaasCheckoutModal({ open, onClose, planId, planName, planPrice, onSuccess }: Props) {
  const { toast } = useToast();
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setPaid(false);
      setBillingType("PIX");
    }
  }, [open]);

  // Polling for PIX
  useEffect(() => {
    if (!result?.paymentId || paid) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("asaas-check-payment", {
          body: { paymentId: result.paymentId },
        });
        if (data?.status === "received") {
          setPaid(true);
          clearInterval(interval);
          toast({ title: "Pagamento confirmado! 🎉", description: "Sua assinatura está ativa." });
          setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [result?.paymentId, paid]);

  const handleCreate = async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-create-payment", {
        body: { planId, billingType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      if (billingType === "CREDIT_CARD" && data?.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar cobrança", description: translateError(err.message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (result?.pixCopyPaste) {
      navigator.clipboard.writeText(result.pixCopyPaste);
      toast({ title: "Código PIX copiado!" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {paid ? "Pagamento confirmado" : "Assinar plano"}
          </DialogTitle>
        </DialogHeader>

        {paid ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <p className="font-medium">Sua assinatura foi ativada!</p>
          </div>
        ) : !result ? (
          <div className="space-y-4">
            {planName && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{planName}</p>
                {planPrice !== undefined && (
                  <p className="text-primary font-bold text-lg">R$ {Number(planPrice).toFixed(2)} <span className="text-xs text-muted-foreground">/mês</span></p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <RadioGroup value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
                <div className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setBillingType("PIX")}>
                  <RadioGroupItem value="PIX" id="bt-pix" />
                  <QrCode className="h-5 w-5 text-primary" />
                  <Label htmlFor="bt-pix" className="cursor-pointer flex-1">PIX <span className="text-xs text-muted-foreground">— Aprovação imediata</span></Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setBillingType("CREDIT_CARD")}>
                  <RadioGroupItem value="CREDIT_CARD" id="bt-cc" />
                  <CreditCard className="h-5 w-5 text-primary" />
                  <Label htmlFor="bt-cc" className="cursor-pointer flex-1">Cartão de Crédito</Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setBillingType("BOLETO")}>
                  <RadioGroupItem value="BOLETO" id="bt-bol" />
                  <Barcode className="h-5 w-5 text-primary" />
                  <Label htmlFor="bt-bol" className="cursor-pointer flex-1">Boleto <span className="text-xs text-muted-foreground">— Até 3 dias úteis</span></Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={loading} className="gradient-gold border-0 text-primary-foreground">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar cobrança
              </Button>
            </DialogFooter>
          </div>
        ) : billingType === "PIX" ? (
          <div className="space-y-4">
            {result.pixQrCode && (
              <div className="flex justify-center">
                <img src={result.pixQrCode} alt="QR Code PIX" className="w-56 h-56 rounded-lg border" />
              </div>
            )}
            {result.pixCopyPaste && (
              <div className="space-y-2">
                <Label className="text-xs">PIX copia e cola</Label>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs p-2 bg-muted rounded truncate">{result.pixCopyPaste}</code>
                  <Button size="sm" variant="outline" onClick={copyPix}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento…
            </p>
          </div>
        ) : billingType === "BOLETO" ? (
          <div className="space-y-4 text-center">
            <Barcode className="h-12 w-12 text-primary mx-auto" />
            <p className="text-sm">Seu boleto foi gerado.</p>
            <Button asChild className="w-full">
              <a href={result.invoiceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir boleto
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">A confirmação pode levar até 3 dias úteis.</p>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <CreditCard className="h-12 w-12 text-primary mx-auto" />
            <p className="text-sm">Abrimos a página segura de pagamento em outra aba.</p>
            <Button asChild className="w-full">
              <a href={result.invoiceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Pagar com cartão
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
