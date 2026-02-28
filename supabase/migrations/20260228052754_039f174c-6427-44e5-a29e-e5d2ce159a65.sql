
-- Adicionar categoria e método de pagamento em financial_records
ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS branch text DEFAULT 'principal';

COMMENT ON COLUMN public.financial_records.category IS 'services | products | commission | fixed_cost | cmv | other';
COMMENT ON COLUMN public.financial_records.payment_method IS 'cash | pix | credit_card | debit_card | other';
COMMENT ON COLUMN public.financial_records.branch IS 'Nome da filial';
