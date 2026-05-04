# Plan: Prevent Local Database Connection

Ensure the application only connects to the production Supabase instance and explicitly blocks any connection to local Supabase development environments.

## 1. Environment Variable Review
- **File:** `.env`
- **Action:** Ensure only production URLs and keys are present.
- **Verification:** Confirm `VITE_SUPABASE_URL` and `SUPABASE_URL` do not point to `localhost`, `127.0.0.1`, or any local IP ranges.

## 2. Supabase Client Validation logic
- **File:** `src/lib/supabase.ts`
- **Action:**
    - Update the initialization logic to include a strict URL validation check.
    - Check if the provided `supabaseUrl` matches local development patterns (e.g., `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`).
    - Throw an explicit error and prevent client initialization if a local URL is detected.
    - Ensure the fallback values (if any) are production-safe.

## 3. Implementation Details
- Add a `validateSupabaseUrl` helper function.
- Integrate the check before `createClient`.
- Maintain existing timeout and retry logic.

## 4. Verification
- Call `validate_build` to ensure code integrity.
- The application will now fail fast if someone attempts to use a local Supabase configuration.
