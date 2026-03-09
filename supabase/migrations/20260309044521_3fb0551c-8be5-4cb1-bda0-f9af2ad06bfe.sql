
-- Remove client-side SELECT access to gmail_tokens (tokens are only needed server-side in edge function)
DROP POLICY IF EXISTS "Users can view own gmail tokens" ON public.gmail_tokens;

-- Also remove INSERT/UPDATE since the edge function uses service role key
DROP POLICY IF EXISTS "Users can insert own gmail tokens" ON public.gmail_tokens;
DROP POLICY IF EXISTS "Users can update own gmail tokens" ON public.gmail_tokens;

-- Keep DELETE so users can disconnect accounts from client
-- (or alternatively handle via edge function too)
