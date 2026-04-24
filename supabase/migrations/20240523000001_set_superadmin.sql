-- Update the trigger function to automatically assign 'admin' role to the specified superadmin email
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email matches the designated superadmin email
  IF (new.email = 'kristalwos@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  ELSE
    -- Default role for all other users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'viewer')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$;

-- Also update existing user_roles if the user already exists in auth.users
-- (Even though currently auth.users is empty, this is good for idempotency and future-proofing)
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'kristalwos@gmail.com' LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    END IF;
END $$;