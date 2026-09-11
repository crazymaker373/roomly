CREATE SCHEMA IF NOT EXISTS roomly;
CREATE SCHEMA IF NOT EXISTS roomly_private;

GRANT USAGE ON SCHEMA roomly TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA roomly_private TO postgres, service_role;

CREATE TYPE roomly.expense_category AS ENUM (
  'moebel', 'deko', 'elektronik', 'kueche', 'sonstiges'
);

CREATE TYPE roomly.member_role AS ENUM ('admin', 'member');

CREATE TABLE roomly.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roomly.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roomly_households_invite_code ON roomly.households(invite_code);

CREATE TABLE roomly.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES roomly.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role roomly.member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_roomly_members_user ON roomly.household_members(user_id);
CREATE INDEX idx_roomly_members_household ON roomly.household_members(household_id);

CREATE TABLE roomly.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES roomly.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  size_x NUMERIC NOT NULL DEFAULT 3,
  size_y NUMERIC NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roomly_rooms_household ON roomly.rooms(household_id);

CREATE TABLE roomly.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES roomly.rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category roomly.expense_category NOT NULL DEFAULT 'sonstiges',
  receipt_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roomly_expenses_room ON roomly.expenses(room_id);
CREATE INDEX idx_roomly_expenses_created_by ON roomly.expenses(created_by);

CREATE TABLE roomly.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES roomly.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  paid_amount NUMERIC(12,2) NOT NULL CHECK (paid_amount >= 0),
  UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_roomly_splits_expense ON roomly.expense_splits(expense_id);

CREATE OR REPLACE FUNCTION roomly_private.is_household_member(hid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = roomly
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM roomly.household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION roomly_private.get_room_household_id(rid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = roomly
STABLE
AS $$
  SELECT household_id FROM roomly.rooms WHERE id = rid;
$$;

CREATE OR REPLACE FUNCTION roomly_private.get_expense_household_id(eid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = roomly
STABLE
AS $$
  SELECT r.household_id
  FROM roomly.expenses e
  JOIN roomly.rooms r ON r.id = e.room_id
  WHERE e.id = eid;
$$;

REVOKE ALL ON FUNCTION roomly_private.is_household_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION roomly_private.get_room_household_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION roomly_private.get_expense_household_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION roomly_private.is_household_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION roomly_private.get_room_household_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION roomly_private.get_expense_household_id(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION roomly.seed_default_rooms(household_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = roomly
AS $$
BEGIN
  IF NOT roomly_private.is_household_member(household_id) THEN
    RAISE EXCEPTION 'Not a household member';
  END IF;

  INSERT INTO roomly.rooms (household_id, name, color, position_x, position_y, size_x, size_y) VALUES
    (household_id, 'Flur', '#94a3b8', 0, 0, 2, 8),
    (household_id, 'Küche', '#22c55e', -4, 2, 4, 3),
    (household_id, 'Bad', '#06b6d4', 3, 5, 2.5, 2.5),
    (household_id, 'Wohnzimmer', '#f59e0b', -5, -2, 5, 4),
    (household_id, 'Zimmer 1', '#8b5cf6', 3, -1, 3.5, 3.5),
    (household_id, 'Zimmer 2', '#ec4899', 3, -5, 3.5, 3.5);
END;
$$;

GRANT EXECUTE ON FUNCTION roomly.seed_default_rooms(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION roomly.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = roomly
AS $$
BEGIN
  INSERT INTO roomly.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_roomly_user_created ON auth.users;
CREATE TRIGGER on_roomly_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION roomly.handle_new_user();

ALTER TABLE roomly.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomly.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomly.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomly.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomly.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roomly.expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON roomly.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert ON roomly.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON roomly.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY households_select ON roomly.households
  FOR SELECT USING (roomly_private.is_household_member(id));
CREATE POLICY households_insert ON roomly.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY households_update ON roomly.households
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM roomly.household_members
      WHERE household_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY members_select ON roomly.household_members
  FOR SELECT USING (roomly_private.is_household_member(household_id));
CREATE POLICY members_insert ON roomly.household_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM roomly.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid() AND hm.role = 'admin'
    )
  );

CREATE POLICY rooms_select ON roomly.rooms
  FOR SELECT USING (roomly_private.is_household_member(household_id));
CREATE POLICY rooms_insert ON roomly.rooms
  FOR INSERT WITH CHECK (roomly_private.is_household_member(household_id));
CREATE POLICY rooms_update ON roomly.rooms
  FOR UPDATE USING (roomly_private.is_household_member(household_id));
CREATE POLICY rooms_delete ON roomly.rooms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM roomly.household_members
      WHERE household_id = rooms.household_id
        AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY expenses_select ON roomly.expenses
  FOR SELECT USING (
    roomly_private.is_household_member(roomly_private.get_expense_household_id(id))
  );
CREATE POLICY expenses_insert ON roomly.expenses
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND roomly_private.is_household_member(roomly_private.get_room_household_id(room_id))
  );
CREATE POLICY expenses_update ON roomly.expenses
  FOR UPDATE USING (
    roomly_private.is_household_member(roomly_private.get_expense_household_id(id))
  );
CREATE POLICY expenses_delete ON roomly.expenses
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM roomly.household_members hm
      JOIN roomly.rooms r ON r.household_id = hm.household_id
      WHERE r.id = expenses.room_id
        AND hm.user_id = auth.uid() AND hm.role = 'admin'
    )
  );

CREATE POLICY splits_select ON roomly.expense_splits
  FOR SELECT USING (
    roomly_private.is_household_member(roomly_private.get_expense_household_id(expense_id))
  );
CREATE POLICY splits_insert ON roomly.expense_splits
  FOR INSERT WITH CHECK (
    roomly_private.is_household_member(roomly_private.get_expense_household_id(expense_id))
  );
CREATE POLICY splits_update ON roomly.expense_splits
  FOR UPDATE USING (
    roomly_private.is_household_member(roomly_private.get_expense_household_id(expense_id))
  );
CREATE POLICY splits_delete ON roomly.expense_splits
  FOR DELETE USING (
    roomly_private.is_household_member(roomly_private.get_expense_household_id(expense_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA roomly TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA roomly TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA roomly GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS roomly_receipts_insert ON storage.objects;
DROP POLICY IF EXISTS roomly_receipts_select ON storage.objects;
DROP POLICY IF EXISTS roomly_receipts_delete ON storage.objects;

CREATE POLICY roomly_receipts_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND auth.uid() IS NOT NULL
  );
CREATE POLICY roomly_receipts_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND auth.uid() IS NOT NULL
  );
CREATE POLICY roomly_receipts_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
