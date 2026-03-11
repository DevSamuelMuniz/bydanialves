import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingTourProps {
  role: "client" | "admin";
  adminLevel?: string | null;
}

// Global singleton to prevent multiple driver instances
let activeDriverInstance: ReturnType<typeof driver> | null = null;

const CLIENT_STEPS = [
  {
    element: "#sidebar-dashboard",
    popover: {
      title: "🏠 Dashboard",
      description: "Aqui você vê um resumo completo: seus agendamentos, plano ativo e muito mais.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-booking",
    popover: {
      title: "📅 Novo Agendamento",
      description: "Clique aqui para agendar um novo horário. Escolha o serviço, data, horário e filial.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-pending",
    popover: {
      title: "⏳ Aguardando Confirmação",
      description: "Acompanhe aqui seus agendamentos que ainda aguardam confirmação da equipe.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-history",
    popover: {
      title: "📋 Histórico",
      description: "Veja todos os seus agendamentos anteriores com detalhes como local, preço e status.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-plans",
    popover: {
      title: "👑 Meu Plano",
      description: "Conheça e assine nossos planos mensais com benefícios exclusivos e descontos especiais.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-profile",
    popover: {
      title: "👤 Perfil",
      description: "Atualize seus dados pessoais, foto de perfil e filial preferida.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#header-search",
    popover: {
      title: "🔍 Busca Rápida",
      description: "Pesquise rapidamente por serviços, agendamentos ou informações do sistema.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#header-avatar",
    popover: {
      title: "⚙️ Menu do Usuário",
      description: "Acesse seu perfil, configurações e saia da conta clicando no seu avatar.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
  {
    popover: {
      title: "🎉 Tudo pronto!",
      description: "Você conheceu todas as funcionalidades do sistema. Bom uso! Caso precise de ajuda, estamos sempre aqui.",
    },
  },
];

const ADMIN_STEPS_BASE = [
  {
    element: "#sidebar-admin-dashboard",
    popover: {
      title: "📊 Dashboard",
      description: "Visão geral do negócio: KPIs, receita, agendamentos do dia e desempenho das filiais.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-admin-agenda",
    popover: {
      title: "📅 Agenda",
      description: "Gerencie todos os agendamentos. Confirme, cancele ou complete atendimentos em tempo real.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-admin-clients",
    popover: {
      title: "👥 Clientes",
      description: "Visualize e gerencie a base de clientes: perfis, histórico de atendimentos e status.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-admin-services",
    popover: {
      title: "✂️ Serviços",
      description: "Cadastre e edite os serviços oferecidos, com preços, duração e imagens.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#sidebar-admin-finance",
    popover: {
      title: "💰 Financeiro",
      description: "Acompanhe receitas e despesas, filtre por filial e visualize relatórios financeiros.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#header-search",
    popover: {
      title: "🔍 Busca Global",
      description: "Encontre clientes, agendamentos e informações rapidamente com a busca global.",
      side: "bottom" as const,
      align: "start" as const,
    },
  },
  {
    element: "#header-avatar",
    popover: {
      title: "⚙️ Menu do Administrador",
      description: "Acesse seu perfil, configurações e saia da conta pelo menu do avatar.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
  {
    popover: {
      title: "🎉 Bem-vindo ao painel!",
      description: "Você está pronto para gerenciar o sistema. Explore as funcionalidades e qualquer dúvida estamos à disposição!",
    },
  },
];

export function OnboardingTour({ role, adminLevel }: OnboardingTourProps) {
  const { user } = useAuth();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user || startedRef.current) return;

    const storageKey = `onboarding_done_${user.id}_${role}`;
    const alreadyDone = localStorage.getItem(storageKey);
    if (alreadyDone) return;

    // Destroy any existing global instance before creating a new one
    if (activeDriverInstance) {
      try { activeDriverInstance.destroy(); } catch {}
      activeDriverInstance = null;
    }

    startedRef.current = true;

    const timer = setTimeout(() => {
      const steps = role === "client" ? CLIENT_STEPS : ADMIN_STEPS_BASE;

      const validSteps = steps.filter((step) => {
        if (!("element" in step) || !step.element) return true;
        return !!document.querySelector(step.element as string);
      });

      if (validSteps.length === 0) return;

      const instance = driver({
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Concluir ✓",
        overlayOpacity: 0.35,
        smoothScroll: true,
        allowClose: true,
        popoverClass: "onboarding-popover",
        onDestroyStarted: () => {
          localStorage.setItem(storageKey, "true");
          instance.destroy();
          activeDriverInstance = null;
        },
        steps: validSteps,
      });

      driverRef.current = instance;
      activeDriverInstance = instance;
      instance.drive();
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [user, role]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        try { driverRef.current.destroy(); } catch {}
        activeDriverInstance = null;
      }
    };
  }, []);

  return null;
}
