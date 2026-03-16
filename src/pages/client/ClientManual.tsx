import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Crown, CalendarPlus, XCircle, User, Bell, Star, LogIn, HelpCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

function Accordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;
  return (
    <Card className={cn("border-border/60 transition-all duration-200", open && "border-primary/30 shadow-sm")}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn("p-2 rounded-lg shrink-0 transition-colors", open ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 font-semibold text-foreground text-sm">{section.title}</span>
        {section.badge && (
          <Badge variant="outline" className="text-xs mr-2 border-primary/30 text-primary">{section.badge}</Badge>
        )}
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <CardContent className="pt-0 pb-5 px-5 border-t border-border/40 mt-0">
          <div className="pt-4 text-sm text-foreground/85 space-y-3 leading-relaxed">
            {section.content}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <p>{text}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg p-3">
      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <p className="text-xs text-foreground/80">{children}</p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
      <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
      <p className="text-xs text-foreground/80">{children}</p>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: "cadastro",
    icon: LogIn,
    title: "1. Cadastro e Primeiro Acesso",
    content: (
      <>
        <p>Para utilizar o sistema <strong>By Dani Alves Beauty Express</strong>, você precisa criar uma conta.</p>
        <div className="space-y-2">
          <Step n={1} text={<>Acesse a Landing Page e clique em <strong>"Assinar Plano"</strong> ou <strong>"Entrar"</strong>.</>} />
          <Step n={2} text={<>Preencha seu <strong>nome completo</strong>, <strong>e-mail</strong> e <strong>senha</strong>. O e-mail será seu login.</>} />
          <Step n={3} text={<>Informe seu <strong>WhatsApp</strong> com DDD (ex: 11999998888). Este campo é obrigatório para confirmações e lembretes.</>} />
          <Step n={4} text={<>Selecione seu <strong>gênero</strong> — isso ajuda na personalização dos planos disponíveis.</>} />
          <Step n={5} text={<>Leia e aceite os <strong>Termos de Serviço</strong>. O aceite é obrigatório para prosseguir.</>} />
          <Step n={6} text={<>Você receberá um <strong>e-mail de confirmação</strong>. Clique no link para ativar sua conta antes de fazer login.</>} />
        </div>
        <Tip>Após confirmar o e-mail, faça login e explore o Dashboard.</Tip>
        <Tip>Caso esqueça a senha, use <strong>"Esqueci minha senha"</strong> na tela de login para receber o link de redefinição.</Tip>
      </>
    ),
  },
  {
    id: "dashboard",
    icon: CheckCircle2,
    title: "2. Painel Principal (Dashboard)",
    content: (
      <>
        <p>O Dashboard é a tela inicial após o login. Nela você encontra um resumo de tudo:</p>
        <ul className="space-y-1.5 list-none">
          {[
            "Próximos agendamentos com data, horário e profissional",
            "Status do seu plano ativo (dias restantes e validade)",
            "Histórico resumido dos últimos atendimentos",
            "Atalhos rápidos para novo agendamento e planos",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Tip>Use o menu lateral esquerdo para navegar entre as seções do sistema a qualquer momento.</Tip>
      </>
    ),
  },
  {
    id: "agendamento",
    icon: CalendarPlus,
    title: "3. Fazendo um Novo Agendamento",
    badge: "Passo a passo",
    content: (
      <>
        <p>Você pode agendar um atendimento de forma simples e rápida:</p>
        <div className="space-y-2">
          <Step n={1} text={<>No menu lateral, clique em <strong>"Novo Agendamento"</strong>.</>} />
          <Step n={2} text={<>Selecione a <strong>filial</strong> desejada (caso existam múltiplas unidades disponíveis).</>} />
          <Step n={3} text={<>Escolha o <strong>serviço</strong> que deseja realizar.</>} />
          <Step n={4} text={<>Selecione o <strong>profissional</strong> de sua preferência ou deixe sem preferência.</>} />
          <Step n={5} text={<>Escolha a <strong>data</strong> disponível no calendário.</>} />
          <Step n={6} text={<>Selecione o <strong>horário</strong> disponível para aquela data.</>} />
          <Step n={7} text={<>Revise os detalhes e confirme o agendamento clicando em <strong>"Confirmar"</strong>.</>} />
        </div>
        <Tip>Você receberá uma mensagem de confirmação via WhatsApp após o agendamento ser registrado.</Tip>
        <Warn>Chegue com até <strong>15 minutos de antecedência</strong>. Atrasos superiores a 15 minutos podem resultar no cancelamento automático do horário.</Warn>
        <Warn>O <strong>não comparecimento sem cancelamento prévio</strong> consome o crédito do plano normalmente.</Warn>
      </>
    ),
  },
  {
    id: "historico",
    icon: Star,
    title: "4. Histórico de Atendimentos",
    content: (
      <>
        <p>Em <strong>"Histórico"</strong> no menu lateral você visualiza todos os seus atendimentos realizados e cancelados.</p>
        <ul className="space-y-1.5 list-none">
          {[
            "Filtre por status: pendente, confirmado, concluído ou cancelado",
            "Veja data, horário, profissional e serviço de cada atendimento",
            "Atendimentos concluídos ficam disponíveis para avaliação",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Tip>Avalie o serviço após cada atendimento concluído — sua opinião ajuda a melhorar o atendimento.</Tip>
      </>
    ),
  },
  {
    id: "planos",
    icon: Crown,
    title: "5. Planos de Assinatura",
    badge: "Importante",
    content: (
      <>
        <p>O sistema oferece a <strong>Escova por Assinatura</strong> com diferentes níveis de uso mensal:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse mt-1">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2 border border-border/40 font-semibold">Plano</th>
                <th className="text-center p-2 border border-border/40 font-semibold">Escovas/mês</th>
                <th className="text-center p-2 border border-border/40 font-semibold">Mega Hair</th>
              </tr>
            </thead>
            <tbody>
              {[
                { nome: "Basic Chic", qtd: "4", mega: "Não" },
                { nome: "Fashion", qtd: "6", mega: "Não" },
                { nome: "Glamour", qtd: "8", mega: "Sim" },
                { nome: "Completo 04", qtd: "4 + tratamentos", mega: "Não" },
                { nome: "Completo 06", qtd: "6 + tratamentos", mega: "Não" },
                { nome: "Completo 08", qtd: "8 + tratamentos", mega: "Sim" },
              ].map((p) => (
                <tr key={p.nome} className="hover:bg-muted/30">
                  <td className="p-2 border border-border/40 font-medium">{p.nome}</td>
                  <td className="p-2 border border-border/40 text-center">{p.qtd}</td>
                  <td className={cn("p-2 border border-border/40 text-center font-medium", p.mega === "Sim" ? "text-green-600" : "text-muted-foreground")}>{p.mega}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-1.5 mt-2">
          <p className="font-semibold text-foreground">Regras do plano:</p>
          {[
            "Renovação mensal automática via cartão de crédito (PIX e Boleto não são aceitos)",
            "Uso pessoal e intransferível — cada crédito vale para um atendimento",
            "Créditos não utilizados no mês expiram automaticamente no fim do ciclo de 30 dias",
            "Cada sessão inclui: lavagem, proteção térmica e finalização (lisa ou modelada)",
            "Duração estimada de 30 a 60 minutos por sessão",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "assinar",
    icon: Crown,
    title: "6. Como Assinar um Plano",
    badge: "Passo a passo",
    content: (
      <>
        <div className="space-y-2">
          <Step n={1} text={<>No menu lateral, clique em <strong>"Meu Plano"</strong>.</>} />
          <Step n={2} text={<>Visualize os planos disponíveis com valores e benefícios de cada um.</>} />
          <Step n={3} text={<>Clique em <strong>"Assinar"</strong> no plano desejado.</>} />
          <Step n={4} text={<>Você será direcionado para a página de pagamento segura do <strong>Stripe</strong>.</>} />
          <Step n={5} text={<>Informe os dados do seu cartão de crédito e confirme o pagamento.</>} />
          <Step n={6} text={<>Após a confirmação, o plano é ativado imediatamente e você já pode fazer agendamentos.</>} />
        </div>
        <Tip>A cobrança é feita automaticamente todo mês na mesma data de adesão.</Tip>
        <Warn>Certifique-se de ter um cartão de crédito válido com limite disponível antes de assinar.</Warn>
      </>
    ),
  },
  {
    id: "cancelar",
    icon: XCircle,
    title: "7. Como Cancelar o Plano",
    badge: "Importante",
    content: (
      <>
        <p>Você pode solicitar o cancelamento do plano a qualquer momento, seguindo os passos abaixo:</p>
        <div className="space-y-2">
          <Step n={1} text={<>Acesse <strong>"Meu Plano"</strong> no menu lateral.</>} />
          <Step n={2} text={<>Localize o plano ativo e clique em <strong>"Gerenciar Assinatura"</strong> ou entre em contato com a equipe.</>} />
          <Step n={3} text={<>No portal do cliente (Stripe), selecione a opção <strong>"Cancelar Assinatura"</strong>.</>} />
          <Step n={4} text={<>Confirme o cancelamento. O plano continua ativo até o fim do período já pago.</>} />
        </div>
        <Warn>Após o cancelamento, os créditos restantes expiram ao fim do ciclo atual — não há reembolso proporcional.</Warn>
        <Warn>O cancelamento <strong>não</strong> cancela agendamentos já marcados. Você deve cancelá-los manualmente se necessário.</Warn>
        <Tip>Em caso de dúvida, entre em contato diretamente com o salão pelo WhatsApp antes de cancelar.</Tip>
      </>
    ),
  },
  {
    id: "cancelar-agendamento",
    icon: XCircle,
    title: "8. Cancelando um Agendamento",
    content: (
      <>
        <p>Para cancelar um agendamento futuro:</p>
        <div className="space-y-2">
          <Step n={1} text={<>Acesse <strong>"Histórico"</strong> ou o <strong>Dashboard</strong>.</>} />
          <Step n={2} text={<>Localize o agendamento com status <strong>"Pendente"</strong> ou <strong>"Confirmado"</strong>.</>} />
          <Step n={3} text={<>Clique em <strong>"Cancelar"</strong> e confirme a ação.</>} />
        </div>
        <Warn>Cancelamentos realizados em cima da hora ou o não comparecimento sem aviso consomem o crédito do plano normalmente.</Warn>
        <Tip>Cancele com antecedência sempre que possível para liberar o horário para outras clientes.</Tip>
      </>
    ),
  },
  {
    id: "perfil",
    icon: User,
    title: "9. Editando seu Perfil",
    content: (
      <>
        <p>Acesse <strong>"Perfil"</strong> no menu lateral para gerenciar suas informações:</p>
        <ul className="space-y-1.5 list-none">
          {[
            "Atualize seu nome completo",
            "Altere o número de WhatsApp para contato",
            "Faça upload de uma foto de perfil",
            "Altere sua senha de acesso",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Tip>Mantenha seu WhatsApp sempre atualizado para receber confirmações e lembretes de agendamento.</Tip>
      </>
    ),
  },
  {
    id: "notificacoes",
    icon: Bell,
    title: "10. Notificações",
    content: (
      <>
        <p>O sistema envia notificações automáticas via WhatsApp e dentro da plataforma:</p>
        <ul className="space-y-1.5 list-none">
          {[
            "Confirmação de novo agendamento",
            "Lembrete do atendimento (horas antes)",
            "Atualização de status do agendamento (confirmado, cancelado, concluído)",
            "Avisos sobre vencimento do plano",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Bell className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Tip>O ícone de sino no canto superior direito exibe suas notificações internas não lidas.</Tip>
      </>
    ),
  },
  {
    id: "duvidas",
    icon: HelpCircle,
    title: "11. Dúvidas Frequentes",
    content: (
      <>
        {[
          {
            q: "Posso transferir meu plano para outra pessoa?",
            a: "Não. O plano é de uso pessoal e intransferível. Cada conta está vinculada a um CPF/e-mail único.",
          },
          {
            q: "Posso acumular créditos não utilizados para o próximo mês?",
            a: "Não. Os créditos não utilizados expiram ao final do ciclo de 30 dias e não são acumulativos.",
          },
          {
            q: "O que está incluído em cada sessão de escova?",
            a: "Cada sessão inclui lavagem, proteção térmica e finalização (lisa ou modelada), com duração estimada de 30 a 60 minutos.",
          },
          {
            q: "Posso mudar de plano após assinar?",
            a: "Sim. Entre em contato com a equipe pelo WhatsApp para solicitar a troca de plano.",
          },
          {
            q: "O que acontece se eu atrasar para o atendimento?",
            a: "Há tolerância de 15 minutos de atraso. Após esse período, o horário pode ser cancelado e o crédito consumido.",
          },
          {
            q: "Como recupero minha senha?",
            a: "Na tela de login, clique em 'Esqueci minha senha' e informe seu e-mail. Você receberá um link para redefinição.",
          },
        ].map((faq, i) => (
          <div key={i} className="space-y-1 pb-3 border-b border-border/30 last:border-0 last:pb-0">
            <p className="font-semibold text-foreground">{faq.q}</p>
            <p className="text-muted-foreground">{faq.a}</p>
          </div>
        ))}
      </>
    ),
  },
];

export default function ClientManual() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 shrink-0">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-serif">Cartilha de Uso</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manual completo do cliente · By Dani Alves Beauty Express
          </p>
        </div>
      </div>

      {/* Intro card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-foreground/80 space-y-1">
          <p className="font-semibold text-foreground">Bem-vinda ao sistema By Dani Alves! 💛</p>
          <p>
            Este guia completo explica tudo o que você precisa saber para usar o sistema com tranquilidade:
            como criar sua conta, agendar atendimentos, assinar e cancelar planos, e muito mais.
          </p>
          <p className="text-xs text-muted-foreground pt-1">Clique em cada seção para expandir o conteúdo.</p>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-2">
        {SECTIONS.map((section) => (
          <Accordion key={section.id} section={section} />
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground/60 pt-2">
        By Dani Alves Beauty Express · Em caso de dúvidas não resolvidas, fale conosco pelo WhatsApp.
      </p>
    </div>
  );
}
