-- Migration: Applicant Registration & Management refactor
-- Run once against the Supabase/Postgres database.

-- 1. Citizen ID card reference image (Step 1 upload)
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS id_card_url text;

-- 2. Applicant contact email (already referenced across enrollments code)
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS email varchar;

-- 3. Enrollment payment method + rejection audit trail
ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS payment_method varchar DEFAULT 'online_transfer',
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejected_by_user_id uuid;
