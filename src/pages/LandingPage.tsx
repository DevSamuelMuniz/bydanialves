import { useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Star,
  Clock,
  MapPin,
  Phone,
  Instagram,
  ChevronRight,
  ChevronLeft,
  Bell,
  BarChart3,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import logoLight from "@/assets/logo_light.png";
import logoDark from "@/assets/logo_dark.png";
import { supabase } from "@/integrations/supabase/client";

// ─── Constants ───────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: "Camila Rodrigues",
    rating: 5,
    text: "Melhor salão que já fui! Atendimento impecável, saí com o cabelo incrível. Não troco por nada.",
  },
  {
    name: "Fernanda Lima",
    rating: 5,
    text: "Adoro o ambiente aconchegante e as profissionais são muito atenciosas. Meu cabelo nunca esteve tão bonito!",
  },
  {
    name: "Patrícia Souza",
    rating: 5,
    text: "A escova dura muito mais do que em outros lugares. Qualidade premium e preço justo. Voltarei sempre!",
  },
];

const galleryImages = [
  "https://images.unsplash.com/photo-1560066984-138daaa0f9b6?w=600&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
  "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
  "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80",
];

const storyChapters = [
  {
    title: "O Começo",
    text: "Daniella Alves começou sua jornada há mais de 8 anos, quando ainda era uma jovem apaixonada por beleza e cuidado. Com muita determinação e um sonho grande, abriu seu primeiro salão em um pequeno espaço, mas com um coração enorme.",
  },
  {
    title: "A Paixão pelo Ofício",
    text: "Cada cliente era tratada como única. Daniella se especializou em técnicas avançadas de coloração, cortes e tratamentos capilares, buscando sempre cursos e treinamentos para oferecer o que havia de melhor no mercado da beleza.",
  },
  {
    title: "Crescimento e Expansão",
    text: "O boca a boca foi inevitável. Em poucos anos, o Salão Daniella Alves cresceu e se expandiu para múltiplas unidades, levando o mesmo cuidado e dedicação para muito mais mulheres que mereciam se sentir especiais.",
  },
  {
    title: "Nossa Missão",
    text: "Hoje, nossa missão é clara: elevar a autoestima de cada cliente que entra em nossas unidades. Com um sistema moderno de agendamento, planos por assinatura e uma equipe treinada, entregamos beleza com excelência todos os dias.",
  },
];

const differentials = [
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "Agendamento Online 24h",
    desc: "Agende seus horários a qualquer momento, de onde estiver, sem precisar ligar.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Planos por Assinatura",
    desc: "Serviços mensais com valor fixo e economia real para quem é cliente frequente.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Histórico de Atendimentos",
    desc: "Acompanhe todos os seus agendamentos passados e futuros em um só lugar.",
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: "Múltiplas Unidades",
    desc: "Escolha a unidade mais próxima de você entre todas as nossas filiais.",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Notificações e Lembretes",
    desc: "Nunca perca um horário. Receba lembretes automáticos antes de cada atendimento.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "CRM Administrativo",
    desc: "Painel completo para gestão de clientes, finanças, serviços e relatórios.",
  },
];

// ─── Shared section header ────────────────────────────────────────────────────
function SectionHeader({ badge, title, subtitle }: { badge: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center mb-14">
      <Badge className="gradient-gold text-primary-foreground border-0 shadow-gold px-4 py-1.5 text-xs font-medium tracking-widest uppercase mb-4">
        {badge}
      </Badge>
      <h2 className="font-serif text-3xl md:text-4xl font-bold leading-tight">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-base">{subtitle}</p>}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.from("plans").select("*").eq("active", true).order("price").then(({ data }) => {
      if (data && data.length > 0) setPlans(data);
    });
  }, []);

  const prevChapter = useCallback(() =>
    setActiveChapter((c) => (c === 0 ? storyChapters.length - 1 : c - 1)), []);
  const nextChapter = useCallback(() =>
    setActiveChapter((c) => (c === storyChapters.length - 1 ? 0 : c + 1)), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChapter((c) => (c === storyChapters.length - 1 ? 0 : c + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ═══ NAV ═══ */}
      <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md shadow-md border-border/60" : "glass border-border/40"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="focus:outline-none">
            <img src={logoLight} alt="Salão Daniella Alves" className="h-14 object-contain cursor-pointer" />
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo("depoimentos")} className="hover:text-foreground transition-colors">Depoimentos</button>
            <button onClick={() => scrollTo("historia")} className="hover:text-foreground transition-colors">Nossa História</button>
            <button onClick={() => scrollTo("planos")} className="hover:text-foreground transition-colors">Planos</button>
            <button onClick={() => scrollTo("contato")} className="hover:text-foreground transition-colors">Contato</button>
          </nav>
          <Button size="sm" onClick={() => navigate("/auth")} className="gradient-gold border-0 shadow-gold text-primary-foreground">
            Agendar agora <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ═══ SEÇÃO 1 — HERO ═══ */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="flex flex-col gap-6">
              <Badge className="self-start gradient-gold text-primary-foreground border-0 shadow-gold px-4 py-1.5 text-xs font-medium tracking-widest uppercase">
                ✨ Beleza & Cuidado Exclusivo
              </Badge>
              <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight text-balance">
                Cabelos perfeitos,{" "}
                <span className="gradient-gold-text">experiência inesquecível</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md text-balance">
                Agende online, escolha sua unidade e sinta a diferença de um salão premium com planos exclusivos para você.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Button size="lg" onClick={() => navigate("/auth")} className="gradient-gold border-0 shadow-gold text-primary-foreground text-base font-semibold px-8">
                  <Calendar className="h-5 w-5" />
                  Agendar agora
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo("planos")}
                  className="text-base font-semibold px-8">
                  Ver planos e preços
                </Button>
              </div>
              {/* Stats */}
              <div className="flex gap-8 pt-2">
                {[
                  { value: "8+", label: "Anos de experiência" },
                  { value: "2K+", label: "Clientes atendidas" },
                  { value: "2", label: "Unidades" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-serif text-2xl font-bold gradient-gold-text">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Right */}
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-elevated">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"
                alt="Salão Daniella Alves"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
            </div>
          </div>

          {/* Gallery marquee */}
          <div className="mt-12 overflow-hidden rounded-2xl">
            <div className="flex gap-4 animate-[gallery-marquee_18s_linear_infinite]" style={{ width: "max-content" }}>
              {[...galleryImages, ...galleryImages].map((src, i) => (
                <div key={i} className="flex-shrink-0 w-[280px] md:w-[320px] aspect-[4/3] rounded-2xl overflow-hidden">
                  <img src={src} alt={`Serviço ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 2 — DEPOIMENTOS + UNIDADES ═══ */}
      <section id="depoimentos" className="py-24 bg-secondary/40">
        <div className="max-w-5xl mx-auto px-6">
          <SectionHeader
            badge="Depoimentos"
            title={<>O que dizem nossas <span className="gradient-gold-text">clientes</span></>}
          />

          {/* Testimonial cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/60 hover:border-primary/30 hover:shadow-elevated transition-all duration-300">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                  <p className="text-sm font-semibold">{t.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Unidades */}
          <div>
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8 font-medium">
              Onde encontrar nossas unidades
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">

              {/* Filial Principal */}
              <div className="flex flex-col gap-3">
                <a
                  href="https://maps.app.goo.gl/8EjE6nU1NppMmqiE8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-elevated transition-all duration-300 cursor-pointer block"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src="https://vugesuaephjbygtpyese.supabase.co/storage/v1/object/public/branch-images/branch-1772306240857.jpeg"
                      alt="Filial Principal"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-white font-bold text-sm">Filial Principal</span>
                    </div>
                    <p className="text-white/70 text-xs pl-6">Av. Domingos Ferreira, 2215 — Sala 308</p>
                  </div>
                </a>
                <div className="rounded-2xl overflow-hidden border border-border/60 shadow-elegant">
                  <iframe
                    title="Mapa Filial Principal"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3951.1!2d-34.9010!3d-8.1194!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ab196f0e0e0e0e1%3A0x0!2sAv.+Domingos+Ferreira%2C+2215%2C+Boa+Viagem%2C+Recife+-+PE!5e0!3m2!1spt-BR!2sbr!4v1&q=Av.+Domingos+Ferreira,+2215,+Boa+Viagem,+Recife+PE"
                    width="100%"
                    height="220"
                    style={{ border: 0, display: "block" }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Filial Centro Sul */}
              <div className="flex flex-col gap-3">
                <a
                  href="https://maps.app.goo.gl/FAModEifGVMXaRTz9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-elevated transition-all duration-300 cursor-pointer block"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src="https://vugesuaephjbygtpyese.supabase.co/storage/v1/object/public/branch-images/branch-1772306249342.jpeg"
                      alt="Filial Centro Sul"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-white font-bold text-sm">Filial Centro Sul</span>
                    </div>
                    <p className="text-white/70 text-xs pl-6">Praça Dr. Lula Cabral de Melo, 68 — Parnamirim, Recife</p>
                  </div>
                </a>
                <div className="rounded-2xl overflow-hidden border border-border/60 shadow-elegant">
                  <iframe
                    title="Mapa Filial Centro Sul"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3950.8!2d-34.9200!3d-8.1050!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ab196d4c0e0f0e1%3A0x0!2sPra%C3%A7a+Dr.+Lula+Cabral+de+Melo%2C+68%2C+Parnamirim%2C+Recife+-+PE!5e0!3m2!1spt-BR!2sbr!4v1&q=Praça+Dr.+Lula+Cabral+de+Melo,+68,+Parnamirim,+Recife+PE"
                    width="100%"
                    height="220"
                    style={{ border: 0, display: "block" }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 3 — HISTÓRIA ═══ */}
      <section id="historia" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Nossa história"
            title={<>A história de <span className="gradient-gold-text">Dani Alves</span></>}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Story carousel */}
            <div className="flex flex-col gap-6">
              {/* Dots */}
              <div className="flex gap-2">
                {storyChapters.map((_, i) => (
                  <button key={i} onClick={() => setActiveChapter(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeChapter ? "w-8 gradient-gold" : "w-4 bg-border"}`} />
                ))}
              </div>
              <div className="min-h-[180px]">
                <h3 className="font-serif text-2xl font-bold mb-4 gradient-gold-text">
                  {storyChapters[activeChapter].title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {storyChapters[activeChapter].text}
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="icon" variant="outline" onClick={prevChapter} className="rounded-full h-10 w-10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={nextChapter} className="rounded-full h-10 w-10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Video */}
            <div className="rounded-3xl overflow-hidden aspect-video shadow-elevated bg-muted">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1"
                title="História do Salão Daniella Alves"
                className="w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 4 — DIFERENCIAIS ═══ */}
      <section className="py-24 bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Diferenciais"
            title={<>Somos mais que um <span className="gradient-gold-text">salão de beleza</span></>}
            subtitle="Tecnologia, cuidado e exclusividade reunidos para transformar sua experiência."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentials.map((d) => (
              <div key={d.title}
                className="flex flex-col gap-4 p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300">
                <div className="h-12 w-12 rounded-xl gradient-gold flex items-center justify-center text-primary-foreground shadow-gold">
                  {d.icon}
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-base mb-1">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 5 — PLANOS ═══ */}
      <section id="planos" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            badge="Planos & Assinaturas"
            title={<>Nossas <span className="gradient-gold-text">assinaturas</span></>}
            subtitle="Assine um plano e garanta seus serviços mensais com preço fixo e vantagens exclusivas."
          />

          {plans.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card p-7 space-y-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-2/3" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => <div key={j} className="h-4 bg-muted rounded" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {plans.map((plan, idx) => {
                const isHighlight = idx === 1;
                const includes = plan.includes?.split("\n").flatMap((s: string) => s.split(",")).map((s: string) => s.trim()).filter(Boolean) || [];
                const tierLabels = ["Essencial", "Popular", "Premium"];
                const tierLabel = tierLabels[idx] ?? "Plano";
                return (
                  <div key={plan.id}
                    className={`group relative flex flex-col rounded-3xl border overflow-hidden transition-all duration-300 hover:-translate-y-2 ${
                      isHighlight
                        ? "border-primary/50 shadow-gold bg-card"
                        : "border-border/60 bg-card hover:border-primary/30 hover:shadow-elevated"
                    }`}>

                    {/* Top accent bar */}
                    <div className={`h-1.5 w-full ${isHighlight ? "gradient-gold" : "bg-gradient-to-r from-border/60 to-border/20"}`} />

                    {/* Popular badge */}
                    {isHighlight && (
                      <div className="gradient-gold text-primary-foreground text-center text-[11px] font-bold tracking-widest uppercase py-2 letter-spacing-widest">
                        ✦ Mais popular
                      </div>
                    )}

                    <div className="p-8 flex flex-col gap-6 flex-1">

                      {/* Tier label */}
                      <span className={`inline-flex self-start items-center text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${
                        isHighlight
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-muted/60 text-muted-foreground border border-border"
                      }`}>
                        {tierLabel}
                      </span>

                      {/* Name + description */}
                      <div>
                        <h3 className="font-serif text-2xl font-bold leading-tight">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-end gap-1.5">
                        <span className={`font-serif text-4xl font-bold leading-none ${isHighlight ? "gradient-gold-text" : ""}`}>
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-muted-foreground text-sm mb-1">/mês</span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/40" />

                      {/* Includes */}
                      <ul className="space-y-3 flex-1">
                        {includes.map((item: string) => (
                          <li key={item} className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isHighlight ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="leading-snug">{item}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Restriction */}
                      {plan.restriction && (
                        <div className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border/40 px-3 py-2.5">
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground italic leading-snug">{plan.restriction}</p>
                        </div>
                      )}

                      {/* CTA Button */}
                      <Button
                        className={`w-full font-semibold text-sm py-5 rounded-xl transition-all duration-300 ${
                          isHighlight
                            ? "gradient-gold border-0 text-primary-foreground shadow-gold hover:scale-[1.03] hover:shadow-[0_8px_32px_hsl(var(--primary)/0.5)] active:scale-[0.98]"
                            : "border border-primary/40 bg-transparent text-foreground hover:gradient-gold hover:text-primary-foreground hover:border-transparent hover:scale-[1.03] hover:shadow-gold active:scale-[0.98]"
                        }`}
                        onClick={() => navigate("/auth")}
                      >
                        Assinar agora
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══ SEÇÃO 6 — CTA BANNER ═══ */}
      <section className="py-24 bg-secondary/40">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Badge className="gradient-gold text-primary-foreground border-0 shadow-gold px-4 py-1.5 text-xs font-medium tracking-widest uppercase mb-6">
            Comece agora
          </Badge>
          <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight mb-4">
            Sua transformação começa com{" "}
            <span className="gradient-gold-text">um clique</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Agende seu horário online, escolha o serviço e a unidade mais próxima. Sem fila, sem espera.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")}
              className="gradient-gold border-0 shadow-gold text-primary-foreground text-base font-semibold px-8">
              <Calendar className="h-5 w-5" />
              Quero agendar agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo("planos")}
              className="text-base font-semibold px-8">
              Ver planos
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer id="contato" className="border-t border-border/60 py-16 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <img src={logoDark} alt="Salão Daniella Alves" className="h-10 object-contain mb-4" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Beleza, cuidado e exclusividade em cada detalhe. Visite uma de nossas unidades e sinta a diferença.
              </p>
            </div>
            <div>
              <h4 className="font-serif font-semibold mb-4 text-sm uppercase tracking-wide">Navegação</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  { label: "Depoimentos", id: "depoimentos" },
                  { label: "Nossa história", id: "historia" },
                  { label: "Planos", id: "planos" },
                  { label: "Contato", id: "contato" },
                ].map((l) => (
                  <li key={l.id}>
                    <button onClick={() => scrollTo(l.id)} className="hover:text-foreground transition-colors">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-serif font-semibold mb-4 text-sm uppercase tracking-wide">Contato</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  (81) 9 9999-9999
                </li>
                <li className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-primary shrink-0" />
                  @daniella.alves.salao
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  Várias unidades disponíveis
                </li>
              </ul>
              <div className="mt-6 flex gap-3 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => navigate("/politica-e-termos")} className="text-xs">
                  Política & Termos
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")} className="gradient-gold border-0 shadow-gold text-primary-foreground text-xs font-semibold">
                  Agendar agora
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Salão Daniella Alves. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
