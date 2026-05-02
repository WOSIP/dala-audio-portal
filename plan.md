Fix the TS2307 build error in `src/lib/supabase.ts` by correcting the import path for `AppRole`.

1. Modify `src/lib/supabase.ts`: Change `import { AppRole } from "./types";` to `import { AppRole } from "../types";`.
2. Validate the build.