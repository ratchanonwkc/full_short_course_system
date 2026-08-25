-- ==============================================================================
-- Migration: Setup Users and Audit Logs (Fixed: Non-Recursive & Safe)
-- Date: 2026-08-24
-- Description:
--   1. Cleanly drops previous recursive triggers/functions if any exist.
--   2. Creates public.users table linked to auth.users.
--   3. Sets up a safe, 1-way INSERT trigger from auth.users -> public.users.
--   4. Creates public.audit_logs table.
--   5. Configures Row Level Security (RLS) policies safely without recursion.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- Clean up any prior conflicting triggers & functions
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_public_user_updated ON public.users;
DROP FUNCTION IF EXISTS public.sync_user_to_auth();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ------------------------------------------------------------------------------
-- A. Create public.users Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'registrar' CHECK (role IN ('admin', 'planning', 'registrar', 'finance')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for fast lookups and filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ------------------------------------------------------------------------------
-- Helper Function: Check if current authenticated user is an Admin
-- (Using SECURITY DEFINER to bypass RLS recursion on public.users)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- B. Safe Auto-Sync Trigger: auth.users (INSERT only) -> public.users
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_raw_role TEXT;
    v_clean_role TEXT;
    v_full_name TEXT;
BEGIN
    -- Prevent trigger cascading
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Extract full name from raw_user_meta_data (fallback to email username)
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract role and normalize to allowed enum
    v_raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'registrar'));
    
    IF v_raw_role LIKE '%admin%' OR v_raw_role LIKE '%ผู้ดูแลระบบ%' THEN
        v_clean_role := 'admin';
    ELSIF v_raw_role LIKE '%plan%' OR v_raw_role LIKE '%แผน%' THEN
        v_clean_role := 'planning';
    ELSIF v_raw_role LIKE '%fin%' OR v_raw_role LIKE '%การเงิน%' THEN
        v_clean_role := 'finance';
    ELSE
        v_clean_role := 'registrar';
    END IF;

    -- Insert or ignore if already present
    INSERT INTO public.users (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_clean_role,
        'active',
        COALESCE(NEW.created_at, now()),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Attach trigger strictly ON INSERT to avoid update loops
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- Backfill existing users from auth.users -> public.users
-- ------------------------------------------------------------------------------
INSERT INTO public.users (id, email, full_name, role, status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    CASE 
        WHEN LOWER(COALESCE(au.raw_user_meta_data->>'role', '')) LIKE '%admin%' THEN 'admin'
        WHEN LOWER(COALESCE(au.raw_user_meta_data->>'role', '')) LIKE '%plan%' THEN 'planning'
        WHEN LOWER(COALESCE(au.raw_user_meta_data->>'role', '')) LIKE '%fin%' THEN 'finance'
        ELSE 'registrar'
    END,
    'active',
    COALESCE(au.created_at, now()),
    now()
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- C. Create public.audit_logs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_table TEXT,
    target_id TEXT,
    description TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for audit queries & compliance filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_table, target_id);

-- ------------------------------------------------------------------------------
-- D. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------

-- Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- 2. Admin can read all users
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users"
    ON public.users
    FOR SELECT
    USING (public.is_admin());

-- 3. Admin can manage all users
DROP POLICY IF EXISTS "Admin can manage all users" ON public.users;
CREATE POLICY "Admin can manage all users"
    ON public.users
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Enable RLS on public.audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Admin can read all audit logs
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admin can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());

-- 2. Authenticated users can insert audit logs for activity tracking
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
