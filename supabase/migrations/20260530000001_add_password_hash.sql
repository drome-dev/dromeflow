-- Migration: Add password_hash to profiles (E1 — Migração de Senhas para Hash)
-- Dual-write strategy: legacy plain-text login still works, hash is created on first successful login

BEGIN;

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add password_hash column (nullable for backward compat)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Add display_name and phone columns for auth sync
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. Drop existing RPCs if present
DROP FUNCTION IF EXISTS public.auth_login_v2(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_user_v2(TEXT, TEXT, TEXT, TEXT, UUID[], UUID[], UUID);
DROP FUNCTION IF EXISTS public.update_user_v2(UUID, TEXT, TEXT, TEXT, TEXT, UUID[], UUID[]);

-- 5. Create auth_login_v2 RPC with dual-write
CREATE OR REPLACE FUNCTION public.auth_login_v2(
p_email TEXT,
p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
v_profile RECORD;
v_hash_match BOOLEAN;
v_result JSON;
BEGIN
  -- Find user by email (case-insensitive)
  SELECT * INTO v_profile
  FROM profiles
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
  END IF;

  -- CASE 1: Legacy plain-text (no hash yet)
  IF v_profile.password_hash IS NULL THEN
    IF v_profile.password = p_password THEN
      -- Migrate to hash on successful login (dual-write)
      UPDATE profiles
      SET password_hash = crypt(p_password, gen_salt('bf'))
      WHERE id = v_profile.id;

      v_result := json_build_object(
        'success', true,
        'profile', json_build_object(
          'id', v_profile.id,
          'email', v_profile.email,
          'full_name', v_profile.full_name,
          'role', v_profile.role
        )
      );
      RETURN v_result;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
    END IF;

  -- CASE 2: Hash already exists
  ELSE
    SELECT v_profile.password_hash = crypt(p_password, v_profile.password_hash) INTO v_hash_match;

    IF v_hash_match THEN
      v_result := json_build_object(
        'success', true,
        'profile', json_build_object(
          'id', v_profile.id,
          'email', v_profile.email,
          'full_name', v_profile.full_name,
          'role', v_profile.role
        )
      );
      RETURN v_result;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Credenciais inválidas');
    END IF;
  END IF;
END;
$$;

-- 6. Create create_user_v2 RPC (hashes password, creates auth user with metadata, links everything)
CREATE OR REPLACE FUNCTION public.create_user_v2(
p_email TEXT,
p_password TEXT,
p_full_name TEXT,
p_role TEXT DEFAULT 'user',
p_unit_ids UUID[] DEFAULT '{}',
p_module_ids UUID[] DEFAULT '{}',
p_auto_unit_id UUID DEFAULT NULL,
p_display_name TEXT DEFAULT NULL,
p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
v_user_id UUID;
v_auth_user_id UUID;
v_unit_id UUID;
v_module_id UUID;
v_password_hash TEXT;
v_meta JSONB;
BEGIN
  -- Check duplicate email
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'Já existe um usuário com este e-mail.');
  END IF;

  v_user_id := gen_random_uuid();
  v_password_hash := crypt(p_password, gen_salt('bf'));
  v_meta := jsonb_build_object(
    'display_name', COALESCE(p_display_name, p_full_name),
    'phone', p_phone,
    'provider', 'email',
    'providers', jsonb_build_array('email')
  );

  -- Try to create auth user (for future Supabase Auth integration)
  BEGIN
    v_auth_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_confirmed_at,
      instance_id, aud, role
    ) VALUES (
      v_auth_user_id,
      p_email,
      v_password_hash,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      v_meta,
      now(), now(), '', now(),
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated', 'authenticated'
    );
  EXCEPTION WHEN OTHERS THEN
    v_auth_user_id := NULL;
  END;

  -- Create profile with hash (no plain-text password stored)
  INSERT INTO profiles (id, full_name, email, role, password_hash, auth_user_id, display_name, phone)
  VALUES (v_user_id, p_full_name, p_email, p_role, v_password_hash, v_auth_user_id, p_display_name, p_phone);

  -- Assign auto unit
  IF p_auto_unit_id IS NOT NULL THEN
    INSERT INTO user_units (user_id, unit_id) VALUES (v_user_id, p_auto_unit_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign additional units
  FOREACH v_unit_id IN ARRAY p_unit_ids
  LOOP
    INSERT INTO user_units (user_id, unit_id) VALUES (v_user_id, v_unit_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Assign modules
  FOREACH v_module_id IN ARRAY p_module_ids
  LOOP
    INSERT INTO user_modules (user_id, module_id) VALUES (v_user_id, v_module_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN json_build_object('success', true, 'user_id', v_user_id, 'auth_user_id', v_auth_user_id);
END;
$$;

-- 7. Create update_user_v2 RPC (handles password hashing on update)
CREATE OR REPLACE FUNCTION public.update_user_v2(
p_user_id UUID,
p_full_name TEXT DEFAULT NULL,
p_email TEXT DEFAULT NULL,
p_role TEXT DEFAULT NULL,
p_password TEXT DEFAULT NULL,
p_unit_ids UUID[] DEFAULT NULL,
p_module_ids UUID[] DEFAULT NULL,
p_display_name TEXT DEFAULT NULL,
p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
v_password_hash TEXT;
v_unit_id UUID;
v_module_id UUID;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado.');
  END IF;

  -- Build profile update
  UPDATE profiles SET
    full_name = COALESCE(p_full_name, full_name),
    email = COALESCE(p_email, email),
    role = COALESCE(p_role, role),
    password_hash = CASE
      WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf'))
      ELSE password_hash
    END,
    display_name = COALESCE(p_display_name, display_name),
    phone = COALESCE(p_phone, phone)
  WHERE id = p_user_id;

  -- Update assignments if provided
  IF p_unit_ids IS NOT NULL THEN
    DELETE FROM user_units WHERE user_id = p_user_id;
    FOREACH v_unit_id IN ARRAY p_unit_ids
    LOOP
      INSERT INTO user_units (user_id, unit_id) VALUES (p_user_id, v_unit_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  IF p_module_ids IS NOT NULL THEN
    DELETE FROM user_modules WHERE user_id = p_user_id;
    FOREACH v_module_id IN ARRAY p_module_ids
    LOOP
      INSERT INTO user_modules (user_id, module_id) VALUES (p_user_id, v_module_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$;

COMMIT;
