
## Reestruturação Completa da Landing Page

### Visão Geral

A LP será reescrita com 6 seções distintas, mantendo o header atual e o footer. Os dados dos planos virão do banco de dados real via Supabase (PLANO BASIC CHIC R$129,90, PLANO FASHION R$149,90, PLANO GLAMOUR R$179,90).

---

### Seção 1 — Hero Split + Carrossel automático

**Layout:**
- Div em `grid grid-cols-2`: lado esquerdo com título, descrição e 2 CTAs; lado direito com imagem decorativa (placeholder de salão de beleza via unsplash).
- Abaixo do grid, um carrossel automático de imagens (auto-play a cada 3s) com fotos de unhas/serviços, usando `embla-carousel-react` já instalado no projeto.

**CTAs:**
1. "Fazer meu agendamento" → `/auth`
2. "Ver planos e preços" → scroll `#planos`

---

### Seção 2 — Depoimentos + Carrossel de Produtos

**Reutiliza** o bloco de testimonials já existente ("O que dizem nossas clientes").

Abaixo, um carrossel automático horizontal com logos/nomes de produtos tipicamente usados em salão de beleza (OPI, Essie, Sally Hansen, CND Shellac, Gelish, Morgan Taylor, Kiesque, Nail Tek) — cards com ícone + nome da marca, auto-scroll contínuo (CSS `animation: scroll` infinite).

---

### Seção 3 — História de Dani Alves (Split: carrossel de texto + vídeo)

**Layout split 50/50:**
- **Esquerda:** carrossel de "capítulos" com botões de navegação lateral. Cada slide tem um título + parágrafo contando um trecho da história (ex: "O Começo", "A Paixão pelo Ofício", "Crescimento e Expansão", "Nossa Missão").
- **Direita:** `<iframe>` do YouTube embutido (placeholder com uma URL genérica de apresentação) ou um `<video>` com poster, com aspect ratio 16:9.

---

### Seção 4 — "Somos mais que um salão de beleza"

Cards com diferenciais do sistema, ex:
- Agendamento online 24h
- Sistema de planos por assinatura
- Histórico de atendimentos
- Múltiplas unidades
- Notificações e lembretes
- CRM Administrativo completo

Grid de 3 colunas com ícone gradient-gold, título e descrição.

---

### Seção 5 — Planos (dados reais do banco)

**Dados reais:**
- PLANO BASIC CHIC — R$ 129,90/mês — 04 escovas por mês
- PLANO FASHION — R$ 149,90/mês — 06 escovas por mês (destaque)
- PLANO GLAMOUR — R$ 179,90/mês — 08 escovas por mês

Cards com o mesmo estilo visual já existente (gradient-gold no destacado), CTA "Assinar agora" → `/auth`.

---

### Seção 6 — Banner CTA chamativo

Banner com fundo `gradient-gold`, texto grande impactante, subtítulo e botão de destaque.

---

### Detalhes Técnicos

**Arquivo modificado:** `src/pages/LandingPage.tsx`

- Import do `useEffect` e `useState` para controle dos carrosséis e fetch de planos do Supabase.
- Import do `supabase` client para buscar planos reais.
- Import do `useEmblaCarousel` para os carrosséis automáticos.
- Os carrosséis de imagens e produtos usarão `setInterval` + `emblaApi.scrollNext()` para auto-play.
- O carrossel de história da Dani Alves usará estado local `activeSlide` com navegação manual por botões.
- Planos buscados diretamente da tabela `plans` (já tem RLS pública para `active = true`).
