import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Scissors,
  Calendar,
  Star,
  Clock,
  MapPin,
  Phone,
  Instagram,
  ChevronRight,
  Sparkles,
  Shield,
  Heart,
  Award,
  Users,
  CheckCircle2,
} from "lucide-react";
import logoDark from "@/assets/logo_dark.png";

const services = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    name: "Esmaltação em Gel",
    description: "Acabamento impecável com durabilidade de até 3 semanas.",
    duration: "60 min",
    price: "A partir de R$ 60",
  },
  {
    icon: <Scissors className="h-6 w-6" />,
    name: "Manicure Clássica",
    description: "Cuidado completo para suas unhas com acabamento perfeito.",
    duration: "45 min",
    price: "A partir de R$ 35",
  },
  {
    icon: <Heart className="h-6 w-6" />,
    name: "Pedicure Spa",
    description: "Relaxamento e beleza para seus pés com esfoliação e hidratação.",
    duration: "75 min",
    price: "A partir de R$ 55",
  },
  {
    icon: <Star className="h-6 w-6" />,
    name: "Nail Art",
    description: "Designs exclusivos e personalizados para expressar seu estilo.",
    duration: "90 min",
    price: "A partir de R$ 80",
  },
  {
    icon: <Award className="h-6 w-6" />,
    name: "Blindagem de Unhas",
    description: "Proteção e fortalecimento com resultado natural e duradouro.",
    duration: "75 min",
    price: "A partir de R$ 90",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    name: "Reconstrução",
    description: "Restaure unhas danificadas com técnicas avançadas.",
    duration: "120 min",
    price: "A partir de R$ 110",
  },
];

const testimonials = [
  {
    name: "Camila Rodrigues",
    rating: 5,
    text: "Melhor esmalteria que já fui! Atendimento impecável e resultado incrível. Não troco por nada.",
  },
  {
    name: "Fernanda Lima",
    rating: 5,
    text: "Adoro o ambiente aconchegante e as profissionais são muito atenciosas. Indico para todas as minhas amigas!",
  },
  {
    name: "Patrícia Souza",
    rating: 5,
    text: "O gel dura muito mais do que em outros lugares. Qualidade premium e preço justo. Voltarei sempre!",
  },
];

const plans = [
  {
    name: "Plano Essencial",
    highlight: false,
    price: "R$ 89",
    period: "/mês",
    features: [
      "2 esmaltações em gel/mês",
      "1 manicure clássica/mês",
      "Agendamento prioritário",
      "10% de desconto em serviços avulsos",
    ],
  },
  {
    name: "Plano Premium",
    highlight: true,
    price: "R$ 149",
    period: "/mês",
    features: [
      "4 esmaltações em gel/mês",
      "2 manicures completas/mês",
      "1 pedicure spa/mês",
      "Agendamento VIP",
      "20% de desconto em serviços avulsos",
      "Nail art inclusa 1x/mês",
    ],
  },
  {
    name: "Plano Gold",
    highlight: false,
    price: "R$ 219",
    period: "/mês",
    features: [
      "Serviços ilimitados",
      "Agendamentos sem fila",
      "Desconto especial em produtos",
      "Acesso antecipado a lançamentos",
      "Brinde de aniversário",
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoDark} alt="Esmalteria Daniella Alves" className="h-9 object-contain" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#servicos" className="hover:text-foreground transition-colors">Serviços</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#contato" className="hover:text-foreground transition-colors">Contato</a>
          </nav>
          <Button size="sm" onClick={() => navigate("/auth")}>
            Agendar agora <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* background decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
          <div className="absolute bottom-0 -left-24 h-[400px] w-[400px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <Badge className="mb-6 gradient-gold text-primary-foreground border-0 shadow-gold px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            ✨ Beleza & Cuidado Exclusivo
          </Badge>

          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight text-balance mb-6">
            Unhas perfeitas,{" "}
            <span className="gradient-gold-text">experiência inesquecível</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
            A Esmalteria Daniella Alves combina técnicas exclusivas, produtos premium e um atendimento
            que faz você se sentir especial. Agende online em segundos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-gold">
              <Calendar className="h-5 w-5" />
              Fazer meu agendamento
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}>
              Ver planos e preços
            </Button>
          </div>

          {/* stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: "5.000+", label: "Clientes felizes" },
              { value: "98%", label: "Satisfação" },
              { value: "8 anos", label: "De experiência" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-serif text-3xl font-bold gradient-gold-text">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ──────────────────────────────────────────────── */}
      <section className="py-16 bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Star className="h-5 w-5" />, title: "Profissionais certificadas", desc: "Formação e reciclagem constante" },
              { icon: <Shield className="h-5 w-5" />, title: "Produtos premium", desc: "Marcas nacionais e importadas" },
              { icon: <Clock className="h-5 w-5" />, title: "Pontualidade", desc: "Respeitamos seu horário" },
              { icon: <Heart className="h-5 w-5" />, title: "Ambiente acolhedor", desc: "Conforto e exclusividade" },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-card border border-border/60">
                <div className="h-11 w-11 rounded-xl gradient-gold flex items-center justify-center text-primary-foreground shadow-gold">
                  {item.icon}
                </div>
                <p className="font-serif font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────────── */}
      <section id="servicos" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs uppercase tracking-wider">
              Nossos serviços
            </Badge>
            <h2 className="font-serif text-4xl font-bold">Cuide-se com o melhor</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Do clássico ao contemporâneo, temos o serviço ideal para valorizar a sua beleza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <Card key={s.name} className="group hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:gradient-gold group-hover:text-primary-foreground group-hover:shadow-gold transition-all duration-300">
                    {s.icon}
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-base">{s.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{s.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {s.duration}
                    </span>
                    <span className="text-xs font-semibold text-primary">{s.price}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ───────────────────────────────────────────────── */}
      <section id="planos" className="py-20 bg-secondary/40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs uppercase tracking-wider">
              Planos & Assinaturas
            </Badge>
            <h2 className="font-serif text-4xl font-bold">Beleza sem preocupação</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Assine um plano e garanta seus serviços favoritos todo mês com economia e prioridade no agendamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-6 flex flex-col gap-4 border transition-all duration-300 ${
                  p.highlight
                    ? "gradient-gold text-primary-foreground shadow-gold border-transparent scale-[1.02]"
                    : "bg-card border-border/60 hover:border-primary/30"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-foreground text-background border-0 text-xs px-3 py-1">
                      ⭐ Mais popular
                    </Badge>
                  </div>
                )}
                <div>
                  <p className={`text-sm font-medium ${p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {p.name}
                  </p>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="font-serif text-4xl font-bold">{p.price}</span>
                    <span className={`text-sm pb-1 ${p.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {p.period}
                    </span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${p.highlight ? "text-primary-foreground" : "text-primary"}`} />
                      <span className={p.highlight ? "text-primary-foreground/90" : "text-foreground/80"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/auth")}
                  variant={p.highlight ? "secondary" : "default"}
                  className="w-full mt-2"
                >
                  Assinar agora
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section id="depoimentos" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs uppercase tracking-wider">
              Depoimentos
            </Badge>
            <h2 className="font-serif text-4xl font-bold">O que dizem nossas clientes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/60">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                  <p className="font-semibold text-sm">{t.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="gradient-gold-subtle border border-primary/20 rounded-3xl p-12">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="font-serif text-4xl font-bold mb-4">
              Pronta para se sentir{" "}
              <span className="gradient-gold-text">incrível?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Crie sua conta gratuitamente e agende seu primeiro horário hoje mesmo.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-gold">
              <Calendar className="h-5 w-5" />
              Criar conta e agendar
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER / CONTACT ────────────────────────────────────── */}
      <footer id="contato" className="border-t border-border/60 py-12 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <img src={logoDark} alt="Esmalteria Daniella Alves" className="h-10 object-contain mb-4" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Beleza, cuidado e exclusividade em cada detalhe. Visite uma de nossas unidades e sinta a diferença.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  (11) 9 9999-9999
                </li>
                <li className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-primary" />
                  @esmalteriada
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Várias unidades disponíveis
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links rápidos</h4>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href="#servicos" className="hover:text-foreground transition-colors">Serviços</a></li>
                <li><a href="#planos" className="hover:text-foreground transition-colors">Planos</a></li>
                <li>
                  <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">
                    Criar conta
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/politica-e-termos")} className="hover:text-foreground transition-colors">
                    Política & Termos
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/60 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Esmalteria Daniella Alves. Todos os direitos reservados.</p>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>Feito com carinho para nossas clientes</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
