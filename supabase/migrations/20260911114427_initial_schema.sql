-- Roomly initial schema
-- private schema for security definer functions (not exposed via API)

CREATE SCHEMA IF NOT EXISTS private;

-- Enums
CREATE TYPE public.expense_category AS ENUM (
  'moebel', 'deko', 'elektronik', 'kueche', 'sonstiges'
);

CREATE TYPE public.member_role AS ENUM ('admin', 'member');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Households
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_households_invite_code ON public.households(invite_code);

-- Household members
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_household_members_user ON public.household_members(user_id);
CREATE INDEX idx_household_members_household ON public.household_members(household_id);

-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  size_x NUMERIC NOT NULL DEFAULT 3,
  size_y NUMERIC NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_household ON public.rooms(household_id);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category public.expense_category NOT NULL DEFAULT 'sonstiges',
  receipt_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_room ON public.expenses(room_id);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);

-- Expense splits
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  paid_amount NUMERIC(12,2) NOT NULL CHECK (paid_amount >= 0),
  UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense ON public.expense_splits(expense_id);

-- Security definer: household membership check (private schema)
CREATE OR REPLACE FUNCTION private.is_household_member(hid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.get_room_household_id(rid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT household_id FROM public.rooms WHERE id = rid;
$$;

CREATE OR REPLACE FUNCTION private.get_expense_household_id(eid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.household_id
  FROM public.expenses e
  JOIN public.rooms r ON r.id = e.room_id
  WHERE e.id = eid;
$$;

-- Seed default rooms for a new household
CREATE OR REPLACE FUNCTION public.seed_default_rooms(household_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_household_member(household_id) THEN
    RAISE EXCEPTION 'Not a household member';
  END IF;

  INSERT INTO public.rooms (household_id, name, color, position_x, position_y, size_x, size_y) VALUES
    (household_id, 'Flur', '#94a3b8', 0, 0, 2, 8),
    (household_id, 'Küche', '#22c55e', -4, 2, 4, 3),
    (household_id, 'Bad', '#06b6d4', 3, 5, 2.5, 2.5),
    (household_id, 'Wohnzimmer', '#f59e0b', -5, -2, 5, 4),
    (household_id, 'Zimmer 1', '#8b5cf6', 3, -1, 3.5, 3.5),
    (household_id, 'Zimmer 2', '#ec4899', 3, -5, 3.5, 3.5);
END;
$$;

-- Profile trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Households policies
CREATE POLICY households_select ON public.households
  FOR SELECT USING (private.is_household_member(id));
CREATE POLICY households_insert ON public.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY households_update ON public.households
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Household members policies
CREATE POLICY members_select ON public.household_members
  FOR SELECT USING (private.is_household_member(household_id));
CREATE POLICY members_insert ON public.household_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid() AND hm.role = 'admin'
    )
  );

-- Rooms policies
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT USING (private.is_household_member(household_id));
CREATE POLICY rooms_insert ON public.rooms
  FOR INSERT WITH CHECK (private.is_household_member(household_id));
CREATE POLICY rooms_update ON public.rooms
  FOR UPDATE USING (private.is_household_member(household_id));
CREATE POLICY rooms_delete ON public.rooms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = rooms.household_id
        AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Expenses policies
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT USING (
    private.is_household_member(private.get_expense_household_id(id))
  );
CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND private.is_household_member(private.get_room_household_id(room_id))
  );
CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE USING (
    private.is_household_member(private.get_expense_household_id(id))
  );
CREATE POLICY expenses_delete ON public.expenses
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members hm
      JOIN public.rooms r ON r.household_id = hm.household_id
      WHERE r.id = expenses.room_id
        AND hm.user_id = auth.uid() AND hm.role = 'admin'
    )
  );

-- Expense splits policies
CREATE POLICY splits_select ON public.expense_splits
  FOR SELECT USING (
    private.is_household_member(private.get_expense_household_id(expense_id))
  );
CREATE POLICY splits_insert ON public.expense_splits
  FOR INSERT WITH CHECK (
    private.is_household_member(private.get_expense_household_id(expense_id))
  );
CREATE POLICY splits_update ON public.expense_splits
  FOR UPDATE USING (
    private.is_household_member(private.get_expense_household_id(expense_id))
  );
CREATE POLICY splits_delete ON public.expense_splits
  FOR DELETE USING (
    private.is_household_member(private.get_expense_household_id(expense_id))
  );

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY receipts_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND auth.uid() IS NOT NULL
  );
CREATE POLICY receipts_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND auth.uid() IS NOT NULL
  );
CREATE POLICY receipts_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
