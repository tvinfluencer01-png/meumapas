
CREATE OR REPLACE FUNCTION public.affiliate_profiles_guard_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_affiliate_role(auth.uid(), 'affiliate_admin');
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.rejection_reason := NULL;
    NEW.default_commission_rate := COALESCE(
      (SELECT default_commission_rate FROM public.affiliate_profiles WHERE user_id = NEW.user_id LIMIT 1),
      NEW.default_commission_rate
    );
    NEW.api_key_hash := NULL;
    NEW.token_hash := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.status := OLD.status;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.default_commission_rate := OLD.default_commission_rate;
    NEW.api_key_hash := OLD.api_key_hash;
    NEW.token_hash := OLD.token_hash;
    NEW.affiliate_code := OLD.affiliate_code;
    NEW.user_id := OLD.user_id;
    NEW.signup_ip := OLD.signup_ip;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliate_profiles_guard_privileged_fields ON public.affiliate_profiles;
CREATE TRIGGER affiliate_profiles_guard_privileged_fields
  BEFORE INSERT OR UPDATE ON public.affiliate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_profiles_guard_privileged_fields();
