-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECTION 2: CUSTOM ENUMS
-- ============================================================
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('UPI', 'cash_on_delivery');
CREATE TYPE public.shop_status AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE public.user_role AS ENUM ('student', 'shop_owner', 'rider', 'kitchen', 'admin');

-- ============================================================
-- SECTION 3: TABLES
-- ============================================================
-- Table: app_categories
CREATE TABLE IF NOT EXISTS public.app_categories (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (name)
);

-- Table: app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  rider_mode BOOLEAN DEFAULT true NOT NULL,
  dine_in_enabled BOOLEAN DEFAULT false NOT NULL,
  PRIMARY KEY (key)
);

-- Table: busy_mode_audits
CREATE TABLE IF NOT EXISTS public.busy_mode_audits (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  shop_id UUID NOT NULL,
  is_busy BOOLEAN NOT NULL,
  toggled_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  issue TEXT NOT NULL,
  status TEXT DEFAULT 'unread'::text,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT contact_messages_status_check CHECK ((status = ANY (ARRAY['unread'::text, 'resolved'::text])))
);

-- Table: menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  shop_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system'::text,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: order_audit_logs
CREATE TABLE IF NOT EXISTS public.order_audit_logs (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  order_id UUID,
  changed_by_user_id UUID,
  status_from VARCHAR(50),
  status_to VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: order_chats
CREATE TABLE IF NOT EXISTS public.order_chats (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  order_id UUID,
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  order_id UUID,
  menu_item_id UUID,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  partner_shop_id UUID,
  PRIMARY KEY (id)
);

-- Table: orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  order_number TEXT NOT NULL,
  student_id UUID,
  shop_id UUID,
  rider_id UUID,
  status public.order_status DEFAULT 'pending'::order_status,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 10.00,
  platform_fee DECIMAL(10,2) DEFAULT 5.00,
  payment_method public.payment_method NOT NULL,
  hostel_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  special_note TEXT,
  placed_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  delivery_otp VARCHAR(4),
  block VARCHAR(50),
  floor VARCHAR(50),
  table_number INTEGER,
  order_type TEXT DEFAULT 'delivery'::text,
  PRIMARY KEY (id),
  UNIQUE (order_number)
);

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL,
  role public.user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active'::text,
  PRIMARY KEY (id)
);

-- Table: promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  code TEXT NOT NULL,
  discount_percent DECIMAL NOT NULL,
  banner_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  UNIQUE (code)
);

-- Table: push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  user_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (user_id)
);

-- Table: rider_profiles
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  id UUID NOT NULL,
  shop_id UUID,
  vehicle_type TEXT,
  is_available BOOLEAN DEFAULT true,
  total_delivered INTEGER DEFAULT 0,
  PRIMARY KEY (id)
);

-- Table: shop_collaborations
CREATE TABLE IF NOT EXISTS public.shop_collaborations (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  primary_shop_id UUID NOT NULL,
  partner_shop_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (primary_shop_id, partner_shop_id),
  CONSTRAINT shop_collaborations_no_self_link CHECK ((primary_shop_id <> partner_shop_id))
);

-- Table: shops
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  owner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  upi_id TEXT,
  logo_url TEXT,
  is_open BOOLEAN DEFAULT false,
  status public.shop_status DEFAULT 'pending'::shop_status,
  opening_time TIME,
  closing_time TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  cover_image TEXT,
  dine_in_enabled BOOLEAN DEFAULT false,
  table_count INTEGER DEFAULT 0,
  busy_mode BOOLEAN DEFAULT false,
  PRIMARY KEY (id)
);

-- Table: student_profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID NOT NULL,
  college_name TEXT NOT NULL,
  hostel_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  block VARCHAR(50),
  floor VARCHAR(50),
  PRIMARY KEY (id)
);

-- ============================================================
-- SECTION 4: FOREIGN KEYS
-- ============================================================
ALTER TABLE public.busy_mode_audits ADD CONSTRAINT busy_mode_audits_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.order_audit_logs ADD CONSTRAINT order_audit_logs_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.order_audit_logs ADD CONSTRAINT order_audit_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_chats ADD CONSTRAINT order_chats_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_chats ADD CONSTRAINT order_chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_partner_shop_id_fkey FOREIGN KEY (partner_shop_id) REFERENCES public.shops(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.profiles(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id);
ALTER TABLE public.rider_profiles ADD CONSTRAINT rider_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.rider_profiles ADD CONSTRAINT rider_profiles_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id);
ALTER TABLE public.shop_collaborations ADD CONSTRAINT shop_collaborations_partner_shop_id_fkey FOREIGN KEY (partner_shop_id) REFERENCES public.shops(id);
ALTER TABLE public.shop_collaborations ADD CONSTRAINT shop_collaborations_primary_shop_id_fkey FOREIGN KEY (primary_shop_id) REFERENCES public.shops(id);
ALTER TABLE public.shops ADD CONSTRAINT shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================================
-- SECTION 5: INDEXES
-- ============================================================

-- ============================================================
-- SECTION 6: FUNCTIONS
-- ============================================================
-- Function: admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Double check if caller is definitely an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. You must be an admin to delete users.';
  END IF;
  
  -- Hard Delete from the central authentication table (cascades to wipe everything)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$
;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'::user_role),
    COALESCE(new.raw_user_meta_data->>'full_name', 'CampusBites User'),
    new.email
  );
  RETURN new;
END;
$function$
;

-- Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$function$
;

-- Function: project_summary
CREATE OR REPLACE FUNCTION public.project_summary()
 RETURNS TABLE(active_connections integer, total_connections integer, connections_by_user json, top_queries json, db_size_pretty text, db_size_bytes bigint, storage_per_bucket json, storage_total_pretty text, storage_total_bytes bigint, mau_30d integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  storage_total bigint := 0;
  storage_total_pretty_text text := '0 bytes';
  storage_per_bucket_json json := '[]'::json;
  top_queries_json json := '[]'::json;
BEGIN
  -- compute active and total connections, connections_by_user, db size, mau
  RETURN QUERY
  WITH
  active AS (
    SELECT count(*) AS active_connections
    FROM pg_stat_activity
    WHERE state = 'active'
  ),
  total AS (
    SELECT count(*) AS total_connections
    FROM pg_stat_activity
  ),
  connections_by_user AS (
    SELECT json_agg(row_to_json(t)) AS connections_by_user
    FROM (
      SELECT usename, application_name, count(*) AS connections
      FROM pg_stat_activity
      GROUP BY usename, application_name
      ORDER BY connections DESC
    ) t
  ),
  db_size AS (
    SELECT
      pg_size_pretty(pg_database_size(current_database())) AS db_size_pretty,
      pg_database_size(current_database()) AS db_size_bytes
  ),
  mau_30d AS (
    SELECT count(*) AS mau_30d
    FROM auth.users
    WHERE last_sign_in_at >= now() - interval '30 days'
  )
  SELECT
    active.active_connections,
    total.total_connections,
    connections_by_user.connections_by_user,
    NULL::json,            -- placeholder for top_queries (filled below)
    db_size.db_size_pretty,
    db_size.db_size_bytes,
    NULL::json,            -- placeholder for storage_per_bucket (filled below)
    NULL::text,            -- placeholder for storage_total_pretty
    NULL::bigint,          -- placeholder for storage_total_bytes
    mau_30d.mau_30d
  FROM active
  CROSS JOIN total
  CROSS JOIN connections_by_user
  CROSS JOIN db_size
  CROSS JOIN mau_30d
  LIMIT 1;

  -- Build top_queries JSON if pg_stat_statements exists
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'pg_stat_statements'
  ) THEN
    EXECUTE
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (SELECT query, calls, total_exec_time, mean_exec_time, rows FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5) t'
    INTO top_queries_json;
  END IF;

  -- Determine storage size source and compute per-bucket JSON + total
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'size'
  ) THEN
    -- objects.size column exists
    EXECUTE
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (SELECT bucket_id, sum(size) AS bytes_used, pg_size_pretty(sum(size)) AS pretty FROM storage.objects GROUP BY bucket_id ORDER BY bytes_used DESC) t'
    INTO storage_per_bucket_json;

    EXECUTE 'SELECT coalesce(sum(size),0) FROM storage.objects' INTO storage_total;
  ELSE
    -- fallback: try to read size from metadata JSON (common pattern)
    EXECUTE
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (SELECT bucket_id, sum((metadata->>''size'')::bigint) AS bytes_used, pg_size_pretty(sum((metadata->>''size'')::bigint)) AS pretty FROM storage.objects GROUP BY bucket_id ORDER BY bytes_used DESC) t'
    INTO storage_per_bucket_json;

    EXECUTE 'SELECT coalesce(sum((metadata->>''size'')::bigint),0) FROM storage.objects' INTO storage_total;
  END IF;

  storage_total_pretty_text := pg_size_pretty(storage_total);

  -- Update the previously returned single row with the computed JSONs and totals
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::integer,
    (SELECT count(*) FROM pg_stat_activity)::integer,
    (SELECT json_agg(row_to_json(t)) FROM (SELECT usename, application_name, count(*) AS connections FROM pg_stat_activity GROUP BY usename, application_name ORDER BY connections DESC) t),
    top_queries_json,
    (SELECT pg_size_pretty(pg_database_size(current_database()))),
    (SELECT pg_database_size(current_database())),
    storage_per_bucket_json,
    storage_total_pretty_text,
    storage_total,
    (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '30 days');
END;
$function$
;

-- Function: rls_auto_enable
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

-- ============================================================
-- SECTION 7: TRIGGERS
-- ============================================================
-- Trigger: on_auth_user_created on users
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS) STATUS
-- ============================================================
ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.busy_mode_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 9: RLS POLICIES
-- ============================================================
CREATE POLICY "Admins can delete categories" ON public.app_categories FOR DELETE
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Admins can insert categories" ON public.app_categories FOR INSERT
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "Admins can update categories" ON public.app_categories FOR UPDATE
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Categories are viewable by everyone" ON public.app_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage settings" ON public.app_settings FOR ALL
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Settings viewable by everyone" ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can delete busy_mode_audits" ON public.busy_mode_audits FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));

CREATE POLICY "Admins can view busy_mode_audits" ON public.busy_mode_audits FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));

CREATE POLICY "Authenticated users can insert audits" ON public.busy_mode_audits FOR INSERT
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "Shop owners can view their own audits" ON public.busy_mode_audits FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.owner_id = auth.uid()) AND (shops.id = busy_mode_audits.shop_id)))));

CREATE POLICY "Anyone can view available menu items" ON public.menu_items FOR SELECT
  USING ((is_available = true));

CREATE POLICY "Menu items are publicly readable" ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Shop owners can delete their menu items" ON public.menu_items FOR DELETE
  USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.owner_id = auth.uid()))));

CREATE POLICY "Shop owners can insert menu items for their shop" ON public.menu_items FOR INSERT
  WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.owner_id = auth.uid()))));

CREATE POLICY "Shop owners can insert their own menu items" ON public.menu_items FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.id = menu_items.shop_id) AND (shops.owner_id = auth.uid())))));

CREATE POLICY "Shop owners can manage their menu" ON public.menu_items FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.id = menu_items.shop_id) AND (shops.owner_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.id = menu_items.shop_id) AND (shops.owner_id = auth.uid())))));

CREATE POLICY "Shop owners can update their menu items" ON public.menu_items FOR UPDATE
  USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.owner_id = auth.uid()))));

CREATE POLICY "Shop owners can update their own menu items" ON public.menu_items FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.id = menu_items.shop_id) AND (shops.owner_id = auth.uid())))));

CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Allow all insert audit logs" ON public.order_audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all read audit logs" ON public.order_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert chats" ON public.order_chats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all read chats" ON public.order_chats FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert order items" ON public.order_items FOR INSERT
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Riders can view order items" ON public.order_items FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'rider'::user_role)))));

CREATE POLICY "Shop owners can view their order items" ON public.order_items FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM (orders
     JOIN shops ON ((orders.shop_id = shops.id)))
  WHERE ((orders.id = order_items.order_id) AND (shops.owner_id = auth.uid())))));

CREATE POLICY "Students can insert order items" ON public.order_items FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.student_id = auth.uid())))));

CREATE POLICY "Students can view own order items" ON public.order_items FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.student_id = auth.uid())))));

CREATE POLICY "Students can view their own order items" ON public.order_items FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.student_id = auth.uid())))));

CREATE POLICY "Admins have full access to orders" ON public.orders FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::user_role)))));

CREATE POLICY "Riders can claim and update their own deliveries" ON public.orders FOR UPDATE
  USING (((rider_id = auth.uid()) OR (rider_id IS NULL)))
  WITH CHECK ((rider_id = auth.uid()));

CREATE POLICY "Riders can view all ready orders" ON public.orders FOR SELECT
  USING (((status = 'ready'::order_status) AND (rider_id IS NULL)));

CREATE POLICY "Riders can view their claimed orders" ON public.orders FOR SELECT
  USING ((rider_id = auth.uid()));

CREATE POLICY "Shop owners can read their shop orders" ON public.orders FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.id = orders.shop_id) AND (shops.owner_id = auth.uid())))));

CREATE POLICY "Shop owners can update their shop orders" ON public.orders FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM shops
  WHERE ((shops.id = orders.shop_id) AND (shops.owner_id = auth.uid())))));

CREATE POLICY "Shop owners can update their shop's orders" ON public.orders FOR UPDATE
  USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.owner_id = auth.uid()))));

CREATE POLICY "Shop owners can view their shop's orders" ON public.orders FOR SELECT
  USING ((shop_id IN ( SELECT shops.id
   FROM shops
  WHERE (shops.owner_id = auth.uid()))));

CREATE POLICY "Students can cancel their own pending orders" ON public.orders FOR UPDATE
  USING ((student_id = auth.uid()))
  WITH CHECK (((student_id = auth.uid()) AND (status = 'cancelled'::order_status)));

CREATE POLICY "Students can insert orders" ON public.orders FOR INSERT
  WITH CHECK ((auth.uid() = student_id));

CREATE POLICY "Students can insert their own orders" ON public.orders FOR INSERT
  WITH CHECK ((auth.uid() = student_id));

CREATE POLICY "Students can read their own orders" ON public.orders FOR SELECT
  USING ((auth.uid() = student_id));

CREATE POLICY "Students can view own orders" ON public.orders FOR SELECT
  USING ((auth.uid() = student_id));

CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
  USING ((auth.uid() = id));

CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));

CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT
  USING ((is_active = true));

CREATE POLICY "Admins can manage collaborations" ON public.shop_collaborations FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));

CREATE POLICY "Allow authenticated delete" ON public.shop_collaborations FOR DELETE TO {authenticated}
  USING (true);

CREATE POLICY "Allow authenticated insert" ON public.shop_collaborations FOR INSERT TO {authenticated}
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON public.shop_collaborations FOR SELECT TO {authenticated}
  USING (true);

CREATE POLICY "Allow authenticated update" ON public.shop_collaborations FOR UPDATE TO {authenticated}
  USING (true);

CREATE POLICY "Allow public read access to active collaborations" ON public.shop_collaborations FOR SELECT
  USING ((is_active = true));

CREATE POLICY "Authenticated can manage" ON public.shop_collaborations FOR ALL
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Authenticated can manage collaborations" ON public.shop_collaborations FOR ALL
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Collaborations viewable by everyone" ON public.shop_collaborations FOR SELECT
  USING (true);

CREATE POLICY "Public can view active collaborations" ON public.shop_collaborations FOR SELECT
  USING ((is_active = true));

CREATE POLICY "Admins have full access to shops" ON public.shops FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::user_role)))));

CREATE POLICY "Anyone can view open shops" ON public.shops FOR SELECT
  USING ((is_open = true));

CREATE POLICY "Anyone can view shops" ON public.shops FOR SELECT
  USING (true);

CREATE POLICY "Shop owners can create their own shop" ON public.shops FOR INSERT
  WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "Shop owners can manage their own shop" ON public.shops FOR ALL
  USING ((owner_id = auth.uid()))
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "Shop owners can update their own shop" ON public.shops FOR UPDATE
  USING ((auth.uid() = owner_id));

CREATE POLICY "Shops are publicly readable" ON public.shops FOR SELECT
  USING ((status = 'approved'::shop_status));

CREATE POLICY "Students can insert own student profile" ON public.student_profiles FOR INSERT
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Students can update own student profile" ON public.student_profiles FOR UPDATE
  USING ((auth.uid() = id));

CREATE POLICY "Students can view own student profile" ON public.student_profiles FOR SELECT
  USING ((auth.uid() = id));

-- ============================================================
-- SECTION 10: STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('campus_assets', 'campus_assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 10b: STORAGE POLICIES
-- ============================================================
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
  WITH CHECK (((bucket_id = 'campus_assets'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Public Access" ON storage.objects FOR SELECT
  USING ((bucket_id = 'campus_assets'::text));

CREATE POLICY "Users can delete their own objects" ON storage.objects FOR DELETE
  USING (((bucket_id = 'campus_assets'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Users can update their own objects" ON storage.objects FOR UPDATE
  USING (((bucket_id = 'campus_assets'::text) AND (auth.role() = 'authenticated'::text)));

-- ============================================================
-- SECTION 11: REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ============================================================
-- SEED DATA: app_settings
-- ============================================================
INSERT INTO public.app_settings (key, value, updated_at, rider_mode, dine_in_enabled) VALUES ('rider_mode', 'rider_2', '"2026-06-04T14:00:24.165Z"', false, true);
INSERT INTO public.app_settings (key, value, updated_at, rider_mode, dine_in_enabled) VALUES ('platform_name', 'TapNosh', '"2026-06-04T14:00:24.165Z"', false, true);
INSERT INTO public.app_settings (key, value, updated_at, rider_mode, dine_in_enabled) VALUES ('delivery_locations', '["Sri Venkateswara Boys hostel","Srinivasa Boys Hostel","My Home PG Boys Hostel"]', '"2026-06-05T02:53:19.107Z"', false, true);

-- ============================================================
-- SECTION 15: VERIFICATION QUERIES
-- ============================================================
-- Run these after migration to verify everything is correct:

-- 1. List all public tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 2. Verify RLS status
SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;

-- 3. Verify all policies exist
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- 4. Verify functions
SELECT proname FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE nspname = 'public' ORDER BY proname;

-- 5. Verify storage buckets
SELECT id, name, public FROM storage.buckets ORDER BY name;

-- 6. Verify realtime publications
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';