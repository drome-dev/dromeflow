-- Migration: Link existing profiles to auth.users (E1 — auth_user_id)
-- Creates auth users for profiles without auth_user_id and links them

CREATE OR REPLACE FUNCTION public.link_existing_profiles_to_auth()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile RECORD;
  v_auth_id UUID;
  v_linked_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  FOR v_profile IN
    SELECT id, email, full_name, role
    FROM profiles
    WHERE auth_user_id IS NULL
  LOOP
    BEGIN
      v_auth_id := gen_random_uuid();

      INSERT INTO auth.users (
        id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_confirmed_at,
        instance_id, aud, role
      ) VALUES (
        v_auth_id,
        v_profile.email,
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        '{}'::jsonb,
        now(), now(), '', now(),
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated', 'authenticated'
      );

      UPDATE profiles
      SET auth_user_id = v_auth_id
      WHERE id = v_profile.id;

      v_linked_count := v_linked_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped_count := v_skipped_count + 1;
      RAISE WARNING 'Could not link profile % (email: %): %',
        v_profile.id, v_profile.email, SQLERRM;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'linked', v_linked_count,
    'skipped', v_skipped_count,
    'total_processed', v_linked_count + v_skipped_count
  );
END;
$$;

-- Drop the function after use: DROP FUNCTION IF EXISTS link_existing_profiles_to_auth();
