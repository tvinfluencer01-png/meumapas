CREATE TABLE public.role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_email TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  role public.app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant','revoke')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_role_audit_log_created_at ON public.role_audit_log (created_at DESC);
CREATE INDEX idx_role_audit_log_target ON public.role_audit_log (target_user_id);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_admin"
  ON public.role_audit_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
