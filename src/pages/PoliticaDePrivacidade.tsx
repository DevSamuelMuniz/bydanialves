import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PoliticaDePrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" className="mb-8 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <h1 className="font-serif text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: fevereiro de 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A <strong className="text-foreground">Esmalteria Daniella Alves</strong> valoriza a sua privacidade e está comprometida em proteger seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações ao utilizar nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dados que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Coletamos as seguintes categorias de dados pessoais:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Dados de cadastro:</strong> nome completo, e-mail, telefone, cidade e gênero.</li>
              <li><strong className="text-foreground">Dados de uso:</strong> histórico de agendamentos, serviços contratados e interações na plataforma.</li>
              <li><strong className="text-foreground">Dados de pagamento:</strong> informações de transação processadas com segurança por nosso parceiro de pagamentos.</li>
              <li><strong className="text-foreground">Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Como Usamos Seus Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Utilizamos suas informações para:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Gerenciar sua conta e autenticar seu acesso;</li>
              <li>Realizar e confirmar agendamentos de serviços;</li>
              <li>Processar pagamentos e assinaturas de planos;</li>
              <li>Enviar notificações relacionadas aos seus agendamentos;</li>
              <li>Melhorar continuamente nossos serviços;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos seus dados pessoais a terceiros. Podemos compartilhar informações apenas com parceiros essenciais para a operação da plataforma (como processadores de pagamento), sempre sob contratos de confidencialidade, ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Armazenamento e Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados em servidores seguros com criptografia em trânsito e em repouso. Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Confirmar a existência de tratamento de seus dados;</li>
              <li>Acessar e obter uma cópia de seus dados;</li>
              <li>Solicitar a correção de dados incompletos ou incorretos;</li>
              <li>Solicitar a exclusão de dados desnecessários;</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para exercer seus direitos, entre em contato conosco pelo WhatsApp ou e-mail disponíveis no aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para manter sua sessão ativa e melhorar a experiência de uso. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento de algumas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados pelo tempo necessário para a prestação dos serviços ou conforme exigido por lei. Após o encerramento da conta, seus dados poderão ser anonimizados ou excluídos conforme aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política periodicamente. Notificaremos sobre mudanças significativas por meio da plataforma. O uso continuado dos serviços após as alterações indica sua aceitação da Política revisada.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
