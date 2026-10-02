/**
 * SQL Schema definition for Supabase Database
 * Users can run this in the Supabase Dashboard -> SQL Editor
 */

export const SUPABASE_SQL_SCHEMA = `-- SKRIP SKEMA DATABASE SUPABASE (TB. POS MATERIAL BANGUNAN)
-- Jalankan skrip ini pada menu "SQL Editor" di dashboard Supabase Anda.

-- 1. Tabel Master Data Material
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  buy_price NUMERIC(15, 2) DEFAULT 0,
  sell_price NUMERIC(15, 2) DEFAULT 0,
  wholesale_price NUMERIC(15, 2) DEFAULT 0,
  wholesale_min_qty NUMERIC(10, 2) DEFAULT 10,
  stock NUMERIC(12, 3) DEFAULT 0,
  min_stock NUMERIC(12, 3) DEFAULT 5,
  location TEXT DEFAULT 'Gudang Utama',
  conversions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Pelanggan & Piutang
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  type TEXT DEFAULT 'Umum',
  debt_limit NUMERIC(15, 2) DEFAULT 5000000,
  current_debt NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Supplier / Pemasok
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  current_debt NUMERIC(15, 2) DEFAULT 0,
  bank_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Transaksi Penjualan Kasir (POS)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  date TIMESTAMPTZ DEFAULT NOW(),
  cashier_id TEXT,
  cashier_name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(15, 2) DEFAULT 0,
  discount_total NUMERIC(15, 2) DEFAULT 0,
  tax_percent NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  grand_total NUMERIC(15, 2) DEFAULT 0,
  payment_method TEXT DEFAULT 'Tunai',
  amount_paid NUMERIC(15, 2) DEFAULT 0,
  change NUMERIC(15, 2) DEFAULT 0,
  is_debt BOOLEAN DEFAULT FALSE,
  debt_remaining NUMERIC(15, 2) DEFAULT 0,
  debt_status TEXT DEFAULT 'Lunas',
  delivery_driver TEXT,
  delivery_plate TEXT,
  notes TEXT
);

-- 5. Tabel Pembelian Barang Masuk (PO Supplier)
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  supplier_invoice_no TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'Lunas',
  amount_paid NUMERIC(15, 2) DEFAULT 0,
  debt_remaining NUMERIC(15, 2) DEFAULT 0,
  cashier_name TEXT,
  notes TEXT
);

-- 6. Tabel Pengaturan Toko & Tema
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  store_name TEXT NOT NULL DEFAULT 'TB. Bangunan Jaya POS',
  tagline TEXT,
  address TEXT,
  phone TEXT,
  receipt_footer TEXT,
  tax_enabled BOOLEAN DEFAULT FALSE,
  tax_percent NUMERIC(5, 2) DEFAULT 11,
  theme_color TEXT DEFAULT 'emerald',
  bank_accounts JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Aktifkan Row Level Security (RLS) atau Izinkan Akses Publik Anonim untuk Demo
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policy agar aplikasi dapat membaca dan menulis data
CREATE POLICY "Akses Penuh Anon/Auth Materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Anon/Auth Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Anon/Auth Suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Anon/Auth Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Anon/Auth Purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Anon/Auth Settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
`;
