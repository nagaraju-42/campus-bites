-- Run this SQL in your Supabase SQL Editor
-- Creates the apk_devices table to track which devices have the Shop Owner APK installed

CREATE TABLE IF NOT EXISTS apk_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  shop_name TEXT NOT NULL DEFAULT 'Unknown Shop',
  device_name TEXT NOT NULL,
  fcm_token TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_owner_id) -- One device entry per shop owner (upserted on each login)
);

-- Allow admins to read all devices
ALTER TABLE apk_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all apk_devices"
  ON apk_devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Shop owners can upsert their own device"
  ON apk_devices FOR ALL
  USING (shop_owner_id = auth.uid())
  WITH CHECK (shop_owner_id = auth.uid());
