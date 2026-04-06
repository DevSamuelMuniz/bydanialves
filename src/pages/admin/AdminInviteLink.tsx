import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, Check, Send, ExternalLink } from "lucide-react";

export default function AdminInviteLink() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/convite`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: "✅ Link copiado!", description: "Envie para o cliente via WhatsApp ou mensagem." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! 🌟\n\nCrie sua conta na By Dani Alves e escolha o plano ideal para você:\n\n${inviteUrl}\n\nTe esperamos! 💅`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-serif text-2xl">Link de Convite</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie este link para clientes que ainda não têm conta. Eles poderão criar a conta e escolher um plano diretamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-primary" />
            Link de Cadastro + Plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="font-mono text-sm" />
            <Button onClick={handleCopy} variant="outline" className="shrink-0 gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleWhatsApp} className="gap-2 flex-1" variant="outline">
              <Send className="h-4 w-4" />
              Enviar via WhatsApp
            </Button>
            <Button asChild variant="outline" className="gap-2 flex-1">
              <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Visualizar página
              </a>
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como funciona:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>O cliente acessa o link que você enviar</li>
              <li>Cria a conta com nome, e-mail e senha</li>
              <li>Escolhe o plano e é redirecionado para o pagamento</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
