-- Criar enum para níveis de acesso admin
CREATE TYPE public.admin_level AS ENUM ('attendant', 'professional', 'manager', 'ceo');

-- Adicionar coluna admin_level na tabela user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS admin_level public.admin_level;

-- CEOs existentes (admin) recebem nível ceo por padrão
UPDATE public.user_roles SET admin_level = 'ceo' WHERE role = 'admin';
