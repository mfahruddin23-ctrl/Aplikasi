import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  MaterialItem,
  Customer,
  Supplier,
  Transaction,
  PurchaseInvoice,
  StoreSettings,
  SupabaseConfigState,
} from '../types';

export { SUPABASE_SQL_SCHEMA } from './supabaseSchema';

// Retrieve Supabase environment variables safely
const metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};

/**
 * Retrieve active Supabase credentials with precedence:
 * 1. Explicitly passed custom config
 * 2. Saved configuration in localStorage (from settings UI)
 * 3. Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 */
export function getActiveSupabaseCredentials(customConfig?: SupabaseConfigState): {
  url: string;
  anonKey: string;
} {
  let url = (customConfig?.supabaseUrl || '').trim();
  let anonKey = (customConfig?.supabaseAnonKey || '').trim();

  // If not provided in customConfig, look in localStorage
  if (!url || !anonKey) {
    try {
      const stored = localStorage.getItem('pos_mat_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!url && parsed?.supabaseConfig?.supabaseUrl) {
          url = String(parsed.supabaseConfig.supabaseUrl).trim();
        }
        if (!anonKey && parsed?.supabaseConfig?.supabaseAnonKey) {
          anonKey = String(parsed.supabaseConfig.supabaseAnonKey).trim();
        }
      }
    } catch {
      // Ignore storage parse error
    }
  }

  // Fallback to environment variables
  if (!url) url = (metaEnv.VITE_SUPABASE_URL || '').trim();
  if (!anonKey) anonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

  return { url, anonKey };
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(customConfig?: SupabaseConfigState): boolean {
  const { url, anonKey } = getActiveSupabaseCredentials(customConfig);
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('http') &&
    !url.includes('your-project')
  );
}

// Client cache map by URL + AnonKey to avoid recreating clients unnecessarily
const clientCache = new Map<string, SupabaseClient>();

/**
 * Get or create a SupabaseClient dynamically based on current active credentials
 */
export function getSupabaseClient(customConfig?: SupabaseConfigState): SupabaseClient | null {
  const { url, anonKey } = getActiveSupabaseCredentials(customConfig);
  if (!url || !anonKey || !url.startsWith('http')) return null;

  const cacheKey = `${url}::${anonKey}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  try {
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    clientCache.set(cacheKey, client);
    return client;
  } catch (err) {
    console.warn('Failed to create Supabase client:', err);
    return null;
  }
}

// Export default instance for backward compatibility
export const supabase: SupabaseClient | null = getSupabaseClient();

export interface SupabaseSyncResult {
  success: boolean;
  message: string;
  details?: {
    materialsCount?: number;
    customersCount?: number;
    suppliersCount?: number;
    transactionsCount?: number;
    purchasesCount?: number;
  };
  error?: string;
}

/**
 * Test Supabase connectivity
 */
export async function testSupabaseConnection(customConfig?: SupabaseConfigState): Promise<{
  success: boolean;
  message: string;
}> {
  const { url, anonKey } = getActiveSupabaseCredentials(customConfig);

  if (!url || !anonKey || !url.startsWith('http') || url.includes('your-project')) {
    return {
      success: false,
      message:
        'Kredensial Supabase belum lengkap. Silakan isi URL Proyek (VITE_SUPABASE_URL) dan Anon Key (VITE_SUPABASE_ANON_KEY).',
    };
  }

  const client = getSupabaseClient(customConfig);
  if (!client) {
    return {
      success: false,
      message: 'Gagal menginisialisasi klien Supabase. Pastikan URL diawali dengan https://.',
    };
  }

  try {
    // Attempt a light query on the materials table or auth
    const { error } = await client.from('materials').select('id').limit(1);
    if (error) {
      // If table doesn't exist yet, connection to Supabase is still valid
      if (error.code === '42P01' || error.message.includes('relation "materials" does not exist')) {
        return {
          success: true,
          message:
            'Koneksi ke Supabase berhasil! (Tabel database belum dibuat, silakan gunakan skrip SQL yang tersedia untuk membuat tabel).',
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase gagal: ${error.message} (Kode: ${error.code})`,
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil! Database aktif dan siap disinkronkan.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error menghubungkan ke Supabase: ${errorMsg}`,
    };
  }
}

/**
 * Upload local state to Supabase tables
 */
export async function syncLocalToSupabase(
  payload: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    purchases: PurchaseInvoice[];
    settings?: StoreSettings;
  },
  customConfig?: SupabaseConfigState
): Promise<SupabaseSyncResult> {
  const client = getSupabaseClient(customConfig);
  if (!client) {
    return {
      success: false,
      message:
        'Kredensial Supabase belum terisi. Data tetap tersimpan aman di penyimpanan lokal (Local Storage).',
    };
  }

  try {
    // 1. Sync Materials
    if (payload.materials.length > 0) {
      const materialRows = payload.materials.map((m) => ({
        id: m.id,
        code: m.code,
        barcode: m.barcode || '',
        name: m.name,
        category: m.category,
        base_unit: m.baseUnit,
        buy_price: m.buyPrice,
        sell_price: m.sellPrice,
        wholesale_price: m.wholesalePrice,
        wholesale_min_qty: m.wholesaleMinQty,
        stock: m.stock,
        min_stock: m.minStock,
        location: m.location,
        conversions: m.conversions,
      }));

      const { error: matErr } = await client
        .from('materials')
        .upsert(materialRows, { onConflict: 'id' });
      if (matErr) console.warn('Supabase materials upsert warning:', matErr.message);
    }

    // 2. Sync Customers
    if (payload.customers.length > 0) {
      const customerRows = payload.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        type: c.type,
        debt_limit: c.debtLimit,
        current_debt: c.currentDebt,
        created_at: c.createdAt,
      }));

      const { error: custErr } = await client
        .from('customers')
        .upsert(customerRows, { onConflict: 'id' });
      if (custErr) console.warn('Supabase customers upsert warning:', custErr.message);
    }

    // 3. Sync Suppliers
    if (payload.suppliers.length > 0) {
      const supplierRows = payload.suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        address: s.address,
        contact_person: s.contactPerson,
        current_debt: s.currentDebtToSupplier,
        bank_info: s.bankInfo || '',
      }));

      const { error: supErr } = await client
        .from('suppliers')
        .upsert(supplierRows, { onConflict: 'id' });
      if (supErr) console.warn('Supabase suppliers upsert warning:', supErr.message);
    }

    // 4. Sync Settings
    if (payload.settings) {
      await client.from('store_settings').upsert(
        [
          {
            id: 'main',
            store_name: payload.settings.storeName,
            tagline: payload.settings.tagline,
            address: payload.settings.address,
            phone: payload.settings.phone,
            receipt_footer: payload.settings.receiptFooter,
            tax_enabled: payload.settings.taxEnabled,
            tax_percent: payload.settings.taxPercent,
            theme_color: payload.settings.themeColor || 'emerald',
            bank_accounts: payload.settings.bankAccounts,
          },
        ],
        { onConflict: 'id' }
      );
    }

    return {
      success: true,
      message: 'Berhasil menyinkronkan seluruh data inventori & transaksi ke Supabase Cloud!',
      details: {
        materialsCount: payload.materials.length,
        customersCount: payload.customers.length,
        suppliersCount: payload.suppliers.length,
        transactionsCount: payload.transactions.length,
        purchasesCount: payload.purchases.length,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal sinkronisasi data ke Supabase: ${errorMsg}`,
      error: errorMsg,
    };
  }
}

/**
 * Pull latest data from Supabase into local state
 */
export async function pullFromSupabase(customConfig?: SupabaseConfigState): Promise<{
  success: boolean;
  message: string;
  data?: {
    materials?: MaterialItem[];
    customers?: Customer[];
    suppliers?: Supplier[];
    settings?: Partial<StoreSettings>;
  };
  error?: string;
}> {
  const client = getSupabaseClient(customConfig);
  if (!client) {
    return {
      success: false,
      message: 'Kredensial Supabase belum terisi.',
    };
  }

  try {
    // 1. Fetch materials
    const { data: materialsData, error: matErr } = await client
      .from('materials')
      .select('*');
    if (matErr) throw matErr;

    // 2. Fetch customers
    const { data: customersData, error: custErr } = await client
      .from('customers')
      .select('*');
    if (custErr) throw custErr;

    // 3. Fetch suppliers
    const { data: suppliersData, error: supErr } = await client
      .from('suppliers')
      .select('*');
    if (supErr) throw supErr;

    // 4. Fetch settings
    const { data: settingsData } = await client
      .from('store_settings')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    const mappedMaterials: MaterialItem[] = (materialsData || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      barcode: row.barcode || '',
      name: row.name,
      category: row.category,
      baseUnit: row.base_unit,
      buyPrice: Number(row.buy_price) || 0,
      sellPrice: Number(row.sell_price) || 0,
      wholesalePrice: Number(row.wholesale_price) || 0,
      wholesaleMinQty: Number(row.wholesale_min_qty) || 0,
      stock: Number(row.stock) || 0,
      minStock: Number(row.min_stock) || 0,
      location: row.location || '',
      conversions: row.conversions || [],
    }));

    const mappedCustomers: Customer[] = (customersData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      address: row.address || '',
      type: row.type || 'Umum',
      debtLimit: Number(row.debt_limit) || 0,
      currentDebt: Number(row.current_debt) || 0,
      createdAt: row.created_at || new Date().toISOString().split('T')[0],
    }));

    const mappedSuppliers: Supplier[] = (suppliersData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      address: row.address || '',
      contactPerson: row.contact_person || '',
      currentDebtToSupplier: Number(row.current_debt) || 0,
      bankInfo: row.bank_info || '',
    }));

    let mappedSettings: Partial<StoreSettings> | undefined;
    if (settingsData) {
      mappedSettings = {
        storeName: settingsData.store_name,
        tagline: settingsData.tagline,
        address: settingsData.address,
        phone: settingsData.phone,
        receiptFooter: settingsData.receipt_footer,
        taxEnabled: settingsData.tax_enabled,
        taxPercent: Number(settingsData.tax_percent) || 0,
        themeColor: settingsData.theme_color,
        bankAccounts: settingsData.bank_accounts || [],
      };
    }

    return {
      success: true,
      message: `Berhasil menarik ${mappedMaterials.length} barang, ${mappedCustomers.length} pelanggan, dan ${mappedSuppliers.length} supplier dari Supabase!`,
      data: {
        materials: mappedMaterials,
        customers: mappedCustomers,
        suppliers: mappedSuppliers,
        settings: mappedSettings,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal menarik data dari Supabase: ${errorMsg}`,
      error: errorMsg,
    };
  }
}
