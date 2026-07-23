-- ====================================================================
-- ESQUEMA DO BANCO DE DADOS SUPABASE - CONTROLE DE FINANÇAS PESSOAL
-- Execute este script no SQL Editor do seu projeto Supabase
-- ====================================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('expense', 'income')) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'folder',
    budget_limit NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE TRANSAÇÕES (RECEITAS E DESPESAS)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('expense', 'income')) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'Pix',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura de categorias públicas ou do próprio usuário" ON public.categories;
DROP POLICY IF EXISTS "Permitir inserção de categorias para usuário autenticado" ON public.categories;
DROP POLICY IF EXISTS "Permitir atualização de categorias do próprio usuário" ON public.categories;
DROP POLICY IF EXISTS "Permitir exclusão de categorias do próprio usuário" ON public.categories;
DROP POLICY IF EXISTS "Permitir leitura de categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir inserção de categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir atualização de categorias" ON public.categories;
DROP POLICY IF EXISTS "Permitir exclusão de categorias" ON public.categories;

DROP POLICY IF EXISTS "Permitir leitura de transações do próprio usuário" ON public.transactions;
DROP POLICY IF EXISTS "Permitir inserção de transações do próprio usuário" ON public.transactions;
DROP POLICY IF EXISTS "Permitir atualização de transações do próprio usuário" ON public.transactions;
DROP POLICY IF EXISTS "Permitir exclusão de transações do próprio usuário" ON public.transactions;
DROP POLICY IF EXISTS "Permitir leitura de transações" ON public.transactions;
DROP POLICY IF EXISTS "Permitir inserção de transações" ON public.transactions;
DROP POLICY IF EXISTS "Permitir atualização de transações" ON public.transactions;
DROP POLICY IF EXISTS "Permitir exclusão de transações" ON public.transactions;

-- Politicas RLS para Categorias (Permite acesso para visitantes anônimos e usuários logados)
CREATE POLICY "Permitir leitura de categorias" 
    ON public.categories FOR SELECT 
    USING (true);

CREATE POLICY "Permitir inserção de categorias" 
    ON public.categories FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Permitir atualização de categorias" 
    ON public.categories FOR UPDATE 
    USING (true);

CREATE POLICY "Permitir exclusão de categorias" 
    ON public.categories FOR DELETE 
    USING (true);

-- Politicas RLS para Transações (Permite acesso para visitantes anônimos e usuários logados)
CREATE POLICY "Permitir leitura de transações" 
    ON public.transactions FOR SELECT 
    USING (true);

CREATE POLICY "Permitir inserção de transações" 
    ON public.transactions FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Permitir atualização de transações" 
    ON public.transactions FOR UPDATE 
    USING (true);

CREATE POLICY "Permitir exclusão de transações" 
    ON public.transactions FOR DELETE 
    USING (true);

-- 4. INSERIR CATEGORIAS PADRÃO (user_id é NULL para acesso global)
INSERT INTO public.categories (name, type, color, icon, budget_limit) VALUES
    ('Alimentação', 'expense', '#ef4444', 'utensils', 1500.00),
    ('Moradia', 'expense', '#3b82f6', 'home', 2500.00),
    ('Transporte', 'expense', '#f59e0b', 'car', 800.00),
    ('Lazer & Entretenimento', 'expense', '#ec4899', 'film', 500.00),
    ('Saúde & Cuidados', 'expense', '#10b981', 'activity', 600.00),
    ('Educação', 'expense', '#8b5cf6', 'book', 700.00),
    ('Compras Gerais', 'expense', '#64748b', 'shopping-bag', 600.00),
    ('Salário & Rendimentos', 'income', '#10b981', 'dollar-sign', 0.00),
    ('Investimentos & Dividendos', 'income', '#06b6d4', 'trending-up', 0.00),
    ('Freelance & Outros', 'income', '#84cc16', 'briefcase', 0.00)
ON CONFLICT DO NOTHING;

-- 5. TRIGGER PARA ATUALIZAR AUTOMATICAMENTE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
