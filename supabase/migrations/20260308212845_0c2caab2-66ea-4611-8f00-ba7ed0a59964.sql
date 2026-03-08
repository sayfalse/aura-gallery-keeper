CREATE TABLE public.storage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  quota_bytes bigint NOT NULL DEFAULT 1073741824,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_quotas ENABLE ROW LEVEL SECURITY;

-- Admins can manage quotas
CREATE POLICY "Admins can manage quotas"
  ON public.storage_quotas
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own quota
CREATE POLICY "Users can view own quota"
  ON public.storage_quotas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);