import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, FileText, Scale, Lock, UserCheck, Bell, Cookie, Trash2, RefreshCw, Phone } from "lucide-react";

export default function PoliticaETermos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("aba") === "termos" ? "termos" : "privacidade";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground">Política & Termos</h1>
            <p className="text-xs text-muted-foreground">Última atualização: fevereiro de 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-8 w-full max-w-xs">
            <TabsTrigger value="privacidade" className="flex-1 gap-2">
              <Shield className="h-4 w-4" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="termos" className="flex-1 gap-2">
              <FileText className="h-4 w-4" />
              Termos de Uso
            </TabsTrigger>
          </TabsList>

          {/* ── POLÍTICA DE PRIVACIDADE ── */}
          <TabsContent value="privacidade" className="animate-fade-in space-y-6">
            <Section icon={<Scale />} title="1. Introdução">
              A <strong>Esmalteria Daniella Alves</strong> valoriza a sua privacidade e está comprometida em proteger seus dados pessoais. Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações ao utilizar nossa plataforma.
            </Section>

            <Section icon={<UserCheck />} title="2. Dados que Coletamos">
              <p className="mb-2">Coletamos as seguintes categorias de dados pessoais:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-foreground">Dados de cadastro:</strong> nome completo, e-mail, telefone, cidade e gênero.</li>
                <li><strong className="text-foreground">Dados de uso:</strong> histórico de agendamentos, serviços contratados e interações na plataforma.</li>
                <li><strong className="text-foreground">Dados de pagamento:</strong> informações de transação processadas com segurança por nosso parceiro de pagamentos.</li>
                <li><strong className="text-foreground">Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador.</li>
              </ul>
            </Section>

            <Section icon={<Bell />} title="3. Como Usamos Seus Dados">
              <p className="mb-2">Utilizamos suas informações para:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Gerenciar sua conta e autenticar seu acesso;</li>
                <li>Realizar e confirmar agendamentos de serviços;</li>
                <li>Processar pagamentos e assinaturas de planos;</li>
                <li>Enviar notificações relacionadas aos seus agendamentos;</li>
                <li>Melhorar continuamente nossos serviços;</li>
                <li>Cumprir obrigações legais e regulatórias.</li>
              </ul>
            </Section>

            <Section icon={<Lock />} title="4. Compartilhamento de Dados">
              Não vendemos seus dados pessoais a terceiros. Podemos compartilhar informações apenas com parceiros essenciais para a operação da plataforma (como processadores de pagamento), sempre sob contratos de confidencialidade, ou quando exigido por lei.
            </Section>

            <Section icon={<Shield />} title="5. Armazenamento e Segurança">
              Seus dados são armazenados em servidores seguros com criptografia em trânsito e em repouso. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.
            </Section>

            <Section icon={<UserCheck />} title="6. Seus Direitos (LGPD)">
              <p className="mb-2">Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Confirmar a existência de tratamento de seus dados;</li>
                <li>Acessar e obter uma cópia de seus dados;</li>
                <li>Solicitar a correção de dados incompletos ou incorretos;</li>
                <li>Solicitar a exclusão de dados desnecessários;</li>
                <li>Revogar o consentimento a qualquer momento.</li>
              </ul>
              <p className="mt-3">Para exercer seus direitos, entre em contato conosco pelo WhatsApp ou e-mail disponíveis no aplicativo.</p>
            </Section>

            <Section icon={<Cookie />} title="7. Cookies">
              Utilizamos cookies e tecnologias similares para manter sua sessão ativa e melhorar a experiência de uso. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento de algumas funcionalidades.
            </Section>

            <Section icon={<Trash2 />} title="8. Retenção de Dados">
              Mantemos seus dados pelo tempo necessário para a prestação dos serviços ou conforme exigido por lei. Após o encerramento da conta, seus dados poderão ser anonimizados ou excluídos conforme aplicável.
            </Section>

            <Section icon={<RefreshCw />} title="9. Alterações nesta Política">
              Podemos atualizar esta Política periodicamente. Notificaremos sobre mudanças significativas por meio da plataforma. O uso continuado dos serviços após as alterações indica sua aceitação da Política revisada.
            </Section>
          </TabsContent>

          {/* ── TERMOS DE SERVIÇO ── */}
          <TabsContent value="termos" className="animate-fade-in space-y-6">
            <Section icon={<Scale />} title="1. Aceitação dos Termos">
              Ao acessar e utilizar os serviços da <strong>Esmalteria Daniella Alves</strong>, você concorda com estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, solicitamos que não utilize nossa plataforma.
            </Section>

            <Section icon={<FileText />} title="2. Descrição dos Serviços">
              A Esmalteria Daniella Alves oferece uma plataforma de agendamento online para serviços de beleza, incluindo esmalteria, manicure, pedicure e demais tratamentos estéticos. Os serviços disponíveis podem ser consultados diretamente no aplicativo e estão sujeitos à disponibilidade de horários.
            </Section>

            <Section icon={<UserCheck />} title="3. Cadastro e Conta">
              Para utilizar nossos serviços de agendamento, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
            </Section>

            <Section icon={<Bell />} title="4. Agendamentos e Cancelamentos">
              Os agendamentos são confirmados após a reserva do horário no sistema. Cancelamentos devem ser realizados com <strong className="text-foreground">no mínimo 2 horas de antecedência</strong>. Cancelamentos fora desse prazo podem resultar em cobrança de taxa ou perda do horário sem reembolso.
            </Section>

            <Section icon={<Shield />} title="5. Planos e Assinaturas">
              Os planos de assinatura oferecem benefícios exclusivos, como descontos e prioridade no agendamento. O valor é cobrado conforme o plano escolhido e pode ser cancelado a qualquer momento, sem multa, com efeito a partir do próximo ciclo de cobrança.
            </Section>

            <Section icon={<Lock />} title="6. Conduta do Usuário">
              É vedado o uso da plataforma para fins ilícitos, fraudulentos ou que causem danos a terceiros. A Esmalteria Daniella Alves reserva-se o direito de suspender ou encerrar contas que violem estas diretrizes.
            </Section>

            <Section icon={<Scale />} title="7. Limitação de Responsabilidade">
              A Esmalteria Daniella Alves não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso dos serviços, incluindo falhas técnicas temporárias.
            </Section>

            <Section icon={<RefreshCw />} title="8. Alterações nos Termos">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso continuado da plataforma após as modificações constitui aceitação dos novos Termos.
            </Section>

            <Section icon={<Phone />} title="9. Contato">
              Em caso de dúvidas sobre estes Termos, entre em contato conosco através do WhatsApp ou pelo e-mail disponível no aplicativo.
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <h2 className="font-semibold text-foreground text-base">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
