-- Migration: Rebuild all row creation and management policies
-- Description: Re-establishes RLS policies for row creation (INSERT) and management (ALL) 
-- with a focus on clear role separation and security.

-- 1. Profiles
CREATE POLICY "Admins and superadmins can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. User Roles
CREATE POLICY "Admins and superadmins manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (get_auth_role() IN ('admin', 'superadmin'))
WITH CHECK (get_auth_role() IN ('admin', 'superadmin'));

-- 3. Albums
CREATE POLICY "High-level roles management access"
ON public.albums FOR ALL TO authenticated
USING (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'))
WITH CHECK (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'));

CREATE POLICY "Authenticated users can manage their own albums"
ON public.albums FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid() OR owner_id IS NULL);

-- 4. Comics (Episodes)
CREATE POLICY "High-level roles comic management"
ON public.comics FOR ALL TO authenticated
USING (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'))
WITH CHECK (get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3'));

CREATE POLICY "Creator roles comic management"
ON public.comics FOR ALL TO authenticated
USING (
  get_auth_role() IN ('role1', 'role2') AND 
  (EXISTS (SELECT 1 FROM public.albums WHERE id = album_id AND owner_id = auth.uid()))
)
WITH CHECK (
  get_auth_role() IN ('role1', 'role2') AND 
  (EXISTS (SELECT 1 FROM public.albums WHERE id = album_id AND owner_id = auth.uid()))
);

-- 5. Album Invitations
CREATE POLICY "High-level roles invitation management"
ON public.album_invitations FOR ALL TO authenticated
USING (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  (EXISTS (SELECT 1 FROM public.albums WHERE id = album_id AND owner_id = auth.uid()))
)
WITH CHECK (
  get_auth_role() IN ('superadmin', 'admin', 'editor', 'role3') OR 
  (EXISTS (SELECT 1 FROM public.albums WHERE id = album_id AND owner_id = auth.uid()))
);

-- 6. Merchant / Shop Related (Rebuilding based on discovered needs)
CREATE POLICY "Merchant management access"
ON public.merchants FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Merchant translation management"
ON public.merchant_translations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.merchants WHERE merchant_id = merchant_translations.merchant_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.merchants WHERE merchant_id = merchant_translations.merchant_id AND owner_id = auth.uid()));

CREATE POLICY "Transaction management"
ON public.transactions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.wallets JOIN public.merchants ON wallets.merchant_id = merchants.merchant_id WHERE wallets.id = transactions.wallet_id AND merchants.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.wallets JOIN public.merchants ON wallets.merchant_id = merchants.merchant_id WHERE wallets.id = transactions.wallet_id AND merchants.owner_id = auth.uid()));

-- 7. Job Related
CREATE POLICY "Job seekers insert own profile"
ON public.job_seekers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 8. Profile Translations
CREATE POLICY "Users can manage their own translations"
ON public.profile_translations FOR ALL TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';