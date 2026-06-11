-- ==============================================================================
-- VanStop — Script de Setup do Banco de Dados (Supabase/PostgreSQL)
-- ==============================================================================
-- COMO USAR:
--   1. Acesse: https://supabase.com/dashboard/project/mfgckaxtfxduaqabtnzc/sql/new
--   2. Cole e execute este script completo no SQL Editor do Supabase.
--
-- IMPORTANTE: Execute apenas UMA VEZ. O script é idempotente (usa IF NOT EXISTS
-- e OR REPLACE), portanto é seguro re-executar sem duplicar dados.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. TABELA: public.motoristas
-- ------------------------------------------------------------------------------
-- Armazena o perfil público do motorista, separado do auth.users do Supabase.
-- A coluna `id` é uma chave estrangeira para auth.users(id), garantindo
-- integridade referencial. O trigger abaixo preenche esta tabela automaticamente.
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.motoristas (
    -- Mesmo UUID gerado pelo Supabase Auth em auth.users
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Nome completo, capturado do raw_user_meta_data no momento do sign_up
    nome        TEXT NOT NULL DEFAULT '',

    -- Email espelhado de auth.users para facilitar queries sem JOIN
    email       TEXT,

    -- Timestamps de auditoria
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentário descritivo na tabela
COMMENT ON TABLE public.motoristas IS
    'Perfis públicos dos motoristas. Populado automaticamente via trigger em auth.users.';

COMMENT ON COLUMN public.motoristas.id IS
    'UUID do usuário em auth.users — chave estrangeira com cascade delete.';

COMMENT ON COLUMN public.motoristas.nome IS
    'Nome capturado de auth.users.raw_user_meta_data->>nome no momento do cadastro.';


-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
-- Habilita RLS para garantir que motoristas só acessem seu próprio perfil.
-- O backend usa service_role key (bypassa RLS), mas o front-end com anon key
-- precisará das políticas abaixo.
-- ------------------------------------------------------------------------------

ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- Política: motorista autenticado pode ler apenas o próprio perfil
CREATE POLICY IF NOT EXISTS "motorista_select_own"
    ON public.motoristas
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Política: motorista autenticado pode atualizar apenas o próprio perfil
CREATE POLICY IF NOT EXISTS "motorista_update_own"
    ON public.motoristas
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO: handle_new_motorista()
-- ------------------------------------------------------------------------------
-- Função PL/pgSQL executada pelo trigger sempre que um novo usuário é inserido
-- em auth.users (ou seja, após cada sign_up bem-sucedido).
--
-- Extrai `nome` e `email` do registro recém-criado e insere na tabela motoristas.
-- O ON CONFLICT garante idempotência caso o trigger dispare mais de uma vez.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_motorista()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- executa com privilégios do owner da função (postgres), não do caller
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.motoristas (id, nome, email, created_at, updated_at)
    VALUES (
        NEW.id,
        -- Extrai o nome do campo raw_user_meta_data (JSON) com fallback para string vazia
        COALESCE(NEW.raw_user_meta_data->>'nome', ''),
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
        SET
            nome       = COALESCE(EXCLUDED.nome, public.motoristas.nome),
            email      = COALESCE(EXCLUDED.email, public.motoristas.email),
            updated_at = NOW();

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_motorista() IS
    'Trigger function: propaga id, nome e email de auth.users para public.motoristas após cada sign_up.';


-- ------------------------------------------------------------------------------
-- 4. TRIGGER: on_auth_user_created
-- ------------------------------------------------------------------------------
-- Dispara APÓS cada INSERT em auth.users (evento de cadastro de novo motorista).
-- Chama a função handle_new_motorista() para cada linha inserida.
-- ------------------------------------------------------------------------------

-- Remove o trigger se já existir (para re-execução segura)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_motorista();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
    'Popula public.motoristas automaticamente após cada novo cadastro via Supabase Auth.';


-- ------------------------------------------------------------------------------
-- 5. VERIFICAÇÃO (opcional — execute separadamente para confirmar)
-- ------------------------------------------------------------------------------
-- SELECT * FROM public.motoristas LIMIT 10;
-- SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- ==============================================================================
