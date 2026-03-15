import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Traduz mensagens de erro do Supabase/banco para português */
const ERROR_MAP: Record<string, string> = {
  // Auth
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar.",
  "User already registered": "Este e-mail já está cadastrado.",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
  "Email rate limit exceeded": "Muitas tentativas. Tente novamente em alguns minutos.",
  "Invalid email": "E-mail inválido.",
  "Signup requires a valid password": "Insira uma senha válida.",
  "Token has expired or is invalid": "O link expirou. Solicite um novo.",
  "Unable to validate email address": "Não foi possível validar o e-mail.",

  // Database / RLS
  "violates row-level security policy": "Sem permissão para executar esta ação.",
  "duplicate key value violates unique constraint": "Este registro já existe.",
  "foreign key constraint": "Este item está vinculado a outros registros e não pode ser excluído.",
  "null value in column": "Preencha todos os campos obrigatórios.",
  "value too long": "Um dos campos excede o tamanho máximo permitido.",
  "connection refused": "Não foi possível conectar ao servidor. Tente novamente.",
  "network error": "Erro de conexão. Verifique sua internet.",
  "JWT expired": "Sua sessão expirou. Faça login novamente.",
  "not found": "Registro não encontrado.",
};

export function translateError(message: string): string {
  if (!message) return "Ocorreu um erro inesperado.";
  for (const [key, ptMsg] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return ptMsg;
  }
  // Se a mensagem já parecer estar em português, retorna ela mesma
  const ptPattern = /[áéíóúâêîôûãõàèìòùç]/i;
  if (ptPattern.test(message)) return message;
  // Genérico
  return "Ocorreu um erro. Tente novamente.";
}
