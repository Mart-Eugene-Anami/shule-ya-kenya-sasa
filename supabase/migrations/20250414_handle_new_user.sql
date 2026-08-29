
-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    -- Cast school_id to UUID or set to NULL if not present
    CASE 
      WHEN NEW.raw_user_meta_data->>'school_id' IS NULL THEN NULL
      ELSE (NEW.raw_user_meta_data->>'school_id')::uuid
    END
  );
  RETURN NEW;
END;
$$;

-- Create trigger to execute the function whenever a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
