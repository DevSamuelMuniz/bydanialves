import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermosDeServico() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" className="mb-8 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <h1 className="font-serif text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: fevereiro de 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar os serviços da <strong className="text-foreground">Esmalteria Daniella Alves</strong>, você concorda com estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, solicitamos que não utilize nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição dos Serviços</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Esmalteria Daniella Alves oferece uma plataforma de agendamento online para serviços de beleza, incluindo esmalteria, manicure, pedicure e demais tratamentos estéticos. Os serviços disponíveis podem ser consultados diretamente no aplicativo e estão sujeitos à disponibilidade de horários.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar nossos serviços de agendamento, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Agendamentos e Cancelamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os agendamentos são confirmados após a reserva do horário no sistema. Cancelamentos devem ser realizados com <strong className="text-foreground">no mínimo 2 horas de antecedência</strong>. Cancelamentos fora desse prazo podem resultar em cobrança de taxa ou perda do horário sem reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Planos e Assinaturas</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os planos de assinatura oferecem benefícios exclusivos, como descontos e prioridade no agendamento. O valor é cobrado conforme o plano escolhido e pode ser cancelado a qualquer momento, sem multa, com efeito a partir do próximo ciclo de cobrança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Conduta do Usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              É vedado o uso da plataforma para fins ilícitos, fraudulentos ou que causem danos a terceiros. A Esmalteria Daniella Alves reserva-se o direito de suspender ou encerrar contas que violem estas diretrizes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Esmalteria Daniella Alves não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso dos serviços, incluindo falhas técnicas temporárias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso continuado da plataforma após as modificações constitui aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em caso de dúvidas sobre estes Termos, entre em contato conosco através do WhatsApp ou pelo e-mail disponível no aplicativo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
