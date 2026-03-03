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
  Sparkles,
  Shield,
  Heart,
  Award,
  Users,
  CheckCircle2,
  Bell,
  BarChart3,
  CreditCard,
  Building2,
} from "lucide-react";
import logoDark from "@/assets/logo_dark.png";
import logoDaniAlves from "@/assets/logo-dani-alves.jpg";
import { supabase } from "@/integrations/supabase/client";

// ─── Testimonials data ───────────────────────────────────────────────────────
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

// ─── Products marquee ────────────────────────────────────────────────────────
const salonBrands = [
  "L'Oréal", "Wella", "Kérastase", "Schwarzkopf", "Redken",
  "Matrix", "Amend", "Cadiveu", "Inoar", "Alfaparf",
];

// ─── Hero carousel images ────────────────────────────────────────────────────
const heroImages = [
  "https://images.unsplash.com/photo-1560066984-138daaa0f9b6?w=900&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=80",
  "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=900&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&q=80",
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80",
];

const galleryImages = [
  "https://images.unsplash.com/photo-1560066984-138daaa0f9b6?w=600&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
  "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
  "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80",
];

// ─── Dani Alves story chapters ────────────────────────────────────────────────
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

// ─── System differentials ────────────────────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);

  // Gallery: continuous marquee (no Embla needed)

  // Fetch real plans from DB
  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("price")
      .then(({ data }) => {
        if (data && data.length > 0) setPlans(data);
      });
  }, []);

  const prevChapter = useCallback(() =>
    setActiveChapter((c) => (c === 0 ? storyChapters.length - 1 : c - 1)), []);
  const nextChapter = useCallback(() =>
    setActiveChapter((c) => (c === storyChapters.length - 1 ? 0 : c + 1)), []);

  // Format price
  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════
          NAV
      ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoDark} alt="Salão Daniella Alves" className="h-9 object-contain" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#historia" className="hover:text-foreground transition-colors">Nossa História</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#contato" className="hover:text-foreground transition-colors">Contato</a>
          </nav>
          <Button size="sm" onClick={() => navigate("/auth")}>
            Agendar agora <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 1 — HERO SPLIT + CARROSSEL
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* BG blob */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left — Text + CTAs */}
            <div className="flex flex-col gap-6">
              <Badge className="self-start gradient-gold text-primary-foreground border-0 shadow-gold px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
                ✨ Beleza & Cuidado Exclusivo
              </Badge>

              <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight text-balance">
                Cabelos perfeitos,{" "}
                <span className="gradient-gold-text">experiência inesquecível</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-md text-balance">
                O Salão Daniella Alves combina técnicas exclusivas, produtos premium e um atendimento
                que faz você se sentir especial. Agende online em segundos.
              </p>

              {/* Stats row */}
              <div className="flex gap-8">
                {[
                  { value: "5.000+", label: "Clientes felizes" },
                  { value: "98%", label: "Satisfação" },
                  { value: "8 anos", label: "De experiência" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-serif text-2xl font-bold gradient-gold-text">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => navigate("/auth")} className="shadow-gold">
                  <Calendar className="h-5 w-5" />
                  Fazer meu agendamento
                </Button>
                <Button size="lg" variant="outline"
                  onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}>
                  Ver planos e preços
                </Button>
              </div>
            </div>

            {/* Right — Hero image */}
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-elevated">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"
                alt="Salão Daniella Alves"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>

          {/* Gallery — continuous marquee */}
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

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 2 — DEPOIMENTOS + MARCAS
      ═══════════════════════════════════════════════════════════ */}
      <section id="depoimentos" className="py-20 bg-secondary/40">
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

        {/* Unidades */}
        <div className="mt-16">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8 font-medium">
            Onde encontrar nossas unidades
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Filial Principal */}
            <div className="group relative rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-elevated transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="https://vugesuaephjbygtpyese.supabase.co/storage/v1/object/public/branch-images/branch-1772306240857.jpeg"
                  alt="Filial Principal"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-white font-bold text-base">Filial Principal</span>
                </div>
                <p className="text-white/70 text-sm pl-6">Rua lá em baixo</p>
              </div>
            </div>
            {/* Filial Centro Sul */}
            <div className="group relative rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-elevated transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="https://vugesuaephjbygtpyese.supabase.co/storage/v1/object/public/branch-images/branch-1772306249342.jpeg"
                  alt="Filial Centro Sul"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-white font-bold text-base">Filial Centro Sul</span>
                </div>
                <p className="text-white/70 text-sm pl-6">Rua beco escuro</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 3 — HISTÓRIA DE DANI ALVES
      ═══════════════════════════════════════════════════════════ */}
      <section id="historia" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs uppercase tracking-wider">
              Nossa história
            </Badge>
            <h2 className="font-serif text-4xl font-bold">A história de Dani Alves</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left — story carousel */}
            <div className="flex flex-col gap-6">
              {/* Chapter indicators */}
              <div className="flex gap-2">
                {storyChapters.map((_, i) => (
                  <button key={i} onClick={() => setActiveChapter(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeChapter ? "w-8 gradient-gold" : "w-4 bg-border"}`} />
                ))}
              </div>

              {/* Story content */}
              <div className="min-h-[180px]">
                <h3 className="font-serif text-2xl font-bold mb-4 gradient-gold-text">
                  {storyChapters[activeChapter].title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {storyChapters[activeChapter].text}
                </p>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3">
                <Button variant="outline" size="icon" onClick={prevChapter} className="rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextChapter} className="rounded-full">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="flex items-center text-xs text-muted-foreground ml-2">
                  {activeChapter + 1} / {storyChapters.length}
                </span>
              </div>
            </div>

            {/* Right — video */}
            <div className="rounded-3xl overflow-hidden aspect-video shadow-elevated bg-black">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1"
                title="História da Dani Alves"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 4 — SOMOS MAIS QUE UM SALÃO
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs uppercase tracking-wider">
              Diferenciais
            </Badge>
            <h2 className="font-serif text-4xl font-bold">
              Somos mais que um{" "}
              <span className="gradient-gold-text">salão de beleza</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Combinamos experiência de beleza premium com tecnologia de ponta para uma experiência única.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 5 — PLANOS (dados reais do banco)
      ═══════════════════════════════════════════════════════════ */}
      <section id="planos" className="py-20">
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

          {plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {plans.map((p, idx) => {
                const isHighlight = idx === 1;
                const tierLabels = ["Iniciante", "Mais Popular", "Premium"];
                const tierIcons = ["✦", "⭐", "👑"];
                const escovasCount = p.includes.match(/\d+/)?.[0];
                const escovaLabel = escovasCount ? `${escovasCount}x escovas/mês` : p.includes;

                return (
                  <div key={p.id}
                    className={`relative rounded-3xl flex flex-col border transition-all duration-300 overflow-hidden group ${
                      isHighlight
                        ? "gradient-gold text-primary-foreground shadow-gold border-transparent"
                        : "bg-card border-border/60 hover:border-primary/40 hover:shadow-elevated"
                    }`}>

                    {/* Top bar decorative */}
                    <div className={`h-1.5 w-full ${isHighlight ? "bg-foreground/20" : "bg-gradient-to-r from-primary/40 to-primary/10"}`} />

                    {/* Badge tier */}
                    <div className="px-7 pt-7 pb-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${
                        isHighlight ? "bg-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}>
                        {tierIcons[idx]} {tierLabels[idx]}
                      </span>
                    </div>

                    {/* Plan name + price */}
                    <div className="px-7 pt-5 pb-4">
                      <h3 className={`text-lg font-bold uppercase tracking-wide leading-tight ${isHighlight ? "text-primary-foreground" : "text-foreground"}`}>
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className={`text-sm mt-1 ${isHighlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-end gap-1.5 mt-4">
                        <span className="font-serif text-5xl font-bold leading-none">{formatPrice(p.price)}</span>
                        <span className={`text-sm pb-1.5 ${isHighlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>/mês</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className={`mx-7 border-t ${isHighlight ? "border-primary-foreground/20" : "border-border/50"}`} />

                    {/* Highlight stat */}
                    <div className={`mx-7 my-5 rounded-2xl px-4 py-3 text-center ${isHighlight ? "bg-foreground/15" : "bg-primary/5 border border-primary/10"}`}>
                      <span className={`text-3xl font-bold font-serif ${isHighlight ? "text-primary-foreground" : "text-primary"}`}>
                        {escovasCount}
                      </span>
                      <p className={`text-xs uppercase tracking-wide mt-0.5 ${isHighlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        Escovas por mês
                      </p>
                    </div>

                    {/* Includes list */}
                    <ul className="flex flex-col gap-3 px-7 pb-4 flex-1">
                      {p.includes.split(",").map((feature: string) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isHighlight ? "text-primary-foreground" : "text-primary"}`} />
                          <span className={isHighlight ? "text-primary-foreground/90" : "text-foreground/80"}>
                            {feature.trim()}
                          </span>
                        </li>
                      ))}
                      {/* Agendamento prioritário */}
                      <li className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isHighlight ? "text-primary-foreground" : "text-primary"}`} />
                        <span className={isHighlight ? "text-primary-foreground/90" : "text-foreground/80"}>
                          Agendamento prioritário 24h
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isHighlight ? "text-primary-foreground" : "text-primary"}`} />
                        <span className={isHighlight ? "text-primary-foreground/90" : "text-foreground/80"}>
                          Cancelamento a qualquer momento
                        </span>
                      </li>
                      {idx >= 1 && (
                        <li className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isHighlight ? "text-primary-foreground" : "text-primary"}`} />
                          <span className={isHighlight ? "text-primary-foreground/90" : "text-foreground/80"}>
                            Acesso a promoções exclusivas
                          </span>
                        </li>
                      )}
                    </ul>

                    {/* Restriction note */}
                    {p.restriction && (
                      <div className={`mx-7 mb-4 text-xs px-3 py-2 rounded-xl ${
                        isHighlight ? "bg-foreground/10 text-primary-foreground/70" : "bg-muted text-muted-foreground"
                      }`}>
                        ⚠️ {p.restriction}
                      </div>
                    )}

                    {/* CTA Button */}
                    <div className="px-7 pb-7">
                      <Button
                        onClick={() => navigate("/auth")}
                        variant={isHighlight ? "secondary" : "default"}
                        className={`w-full transition-all duration-300 ${
                          isHighlight
                            ? "hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]"
                            : "hover:scale-[1.03] hover:shadow-gold hover:brightness-110 active:scale-[0.97]"
                        }`}>
                        Assinar agora
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback skeleton */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-3xl bg-card border border-border/60 p-6 h-96 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 6 — BANNER CTA CHAMATIVO
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="gradient-gold rounded-3xl p-12 md:p-20 text-center shadow-gold relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -translate-x-1/2 translate-y-1/2" />

            <div className="relative">
              <Sparkles className="h-12 w-12 text-primary-foreground mx-auto mb-6 opacity-90" />
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
                Sua beleza merece o melhor.<br />Comece hoje mesmo.
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto">
                Crie sua conta gratuitamente, escolha um plano e agende seu primeiro horário em menos de 2 minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}
                  className="text-base font-semibold px-8 shadow-elevated">
                  <Calendar className="h-5 w-5" />
                  Quero agendar agora
                </Button>
                <Button size="lg" variant="outline"
                  onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-base font-semibold px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                  Ver planos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════ */}
      <footer id="contato" className="border-t border-border/60 py-12 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <img src={logoDark} alt="Salão Daniella Alves" className="h-10 object-contain mb-4" />
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
                <li><a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a></li>
                <li><a href="#historia" className="hover:text-foreground transition-colors">Nossa História</a></li>
                <li><a href="#planos" className="hover:text-foreground transition-colors">Planos</a></li>
                <li>
                  <button onClick={() => navigate("/politica-e-termos")}
                    className="hover:text-foreground transition-colors text-left">
                    Política & Termos
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Salão Daniella Alves. Todos os direitos reservados.</p>
            <button onClick={() => navigate("/politica-e-termos")} className="hover:text-foreground transition-colors">
              Política de Privacidade & Termos de Uso
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
