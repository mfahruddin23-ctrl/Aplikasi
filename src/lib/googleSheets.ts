import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  MaterialItem,
  Customer,
  Supplier,
  Transaction,
  PurchaseInvoice,
  StoreSettings,
} from '../types';

// Initialize Firebase App client
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// In-memory token cache (NEVER store in localStorage or sessionStorage as per security guidelines)
let cachedAccessToken: string | null = null;
let currentGoogleUser: User | null = null;

// Auth listener callbacks
type AuthCallback = (user: User | null, token: string | null) => void;
const authListeners: Set<AuthCallback> = new Set();

/**
 * Initialize Google Auth state listener.
 */
export const initGoogleAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentGoogleUser = user;
    if (user && cachedAccessToken) {
      authListeners.forEach((cb) => cb(user, cachedAccessToken));
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
      }
      authListeners.forEach((cb) => cb(user, cachedAccessToken));
      if (onFailure) onFailure();
    }
  });
};

export const subscribeGoogleAuth = (callback: AuthCallback) => {
  authListeners.add(callback);
  callback(currentGoogleUser, cachedAccessToken);
  return () => {
    authListeners.delete(callback);
  };
};

/**
 * Sign in with Google Popup and obtain access token with Sheets scopes
 */
export const signInWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    currentGoogleUser = result.user;
    authListeners.forEach((cb) => cb(result.user, cachedAccessToken));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Popup closed or request cancelled by user is expected interaction, not a fatal runtime error
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google Auth and clear in-memory token
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    currentGoogleUser = null;
    authListeners.forEach((cb) => cb(null, null));
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return currentGoogleUser;
};

/**
 * Extract clean spreadsheet ID from full URL, shared link, or direct ID.
 * Supports all Google Docs & Drive URL formats.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  let str = input.trim();

  // Strip any enclosing quotes, spaces, or brackets
  str = str.replace(/^["'<(\[]+|["'>)\]]+$/g, '');

  // 1. Standard spreadsheets URL: /spreadsheets/d/{id} or /spreadsheets/u/0/d/{id}
  const mSheets = str.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]{15,})/i);
  if (mSheets && mSheets[1]) return mSheets[1];

  // 2. Google Drive file URL: /file/d/{id}
  const mDrive = str.match(/\/file\/d\/([a-zA-Z0-9-_]{15,})/i);
  if (mDrive && mDrive[1]) return mDrive[1];

  // 3. ID in query param: ?id={id} or &id={id}
  const mIdParam = str.match(/[?&]id=([a-zA-Z0-9-_]{15,})/i);
  if (mIdParam && mIdParam[1]) return mIdParam[1];

  // 4. General /d/{id}
  const mGen = str.match(/\/d\/([a-zA-Z0-9-_]{15,})/i);
  if (mGen && mGen[1]) return mGen[1];

  // 5. Raw ID without URL prefix (strip query params and path)
  const clean = str.split(/[?#\/]/)[0].trim();
  if (/^[a-zA-Z0-9-_]{15,}$/.test(clean)) {
    return clean;
  }

  return clean;
}

export interface GoogleSheetsSyncResult {
  success: boolean;
  message: string;
  spreadsheetTitle?: string;
  details?: {
    materialsCount?: number;
    customersCount?: number;
    suppliersCount?: number;
    transactionsCount?: number;
    purchasesCount?: number;
  };
}

/**
 * Test connection to Google Spreadsheet
 */
export async function testSpreadsheetConnection(
  spreadsheetInput: string,
  token?: string | null
): Promise<{
  success: boolean;
  message: string;
  spreadsheetTitle?: string;
  spreadsheetId?: string;
  sheets?: string[];
  requiresGoogleLogin?: boolean;
}> {
  const cleanId = extractSpreadsheetId(spreadsheetInput);
  if (!cleanId || cleanId.length < 15) {
    return {
      success: false,
      message: 'Format link tidak valid. Pastikan link berasal dari Google Spreadsheet (contoh: https://docs.google.com/spreadsheets/d/.../edit).',
    };
  }

  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    return {
      success: false,
      requiresGoogleLogin: true,
      spreadsheetId: cleanId,
      message: 'ID Spreadsheet valid! Silakan klik tombol "Login dengan Google" di atas agar Google memberikan izin baca & tulis data.',
    };
  }

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          spreadsheetId: cleanId,
          message: `Izin akses ditolak (${errMsg}). Pastikan akun Google yang Anda gunakan untuk login memiliki izin Edit pada file spreadsheet ini.`,
        };
      }
      if (res.status === 404) {
        return {
          success: false,
          spreadsheetId: cleanId,
          message: 'File Spreadsheet tidak ditemukan di Google Drive. Pastikan link yang Anda salin sudah lengkap dan benar.',
        };
      }
      return {
        success: false,
        spreadsheetId: cleanId,
        message: `Gagal membaca spreadsheet: ${errMsg}`,
      };
    }

    const data = await res.json();
    const sheetTitles = (data.sheets || []).map((s: any) => s.properties?.title as string);

    return {
      success: true,
      message: `Terhubung dengan sukses ke spreadsheet: "${data.properties?.title || cleanId}"`,
      spreadsheetTitle: data.properties?.title,
      spreadsheetId: cleanId,
      sheets: sheetTitles,
    };
  } catch (err: any) {
    return {
      success: false,
      spreadsheetId: cleanId,
      message: `Gagal menghubungi Google Sheets API: ${err.message || String(err)}`,
    };
  }
}

/**
 * Connect to an existing Google Spreadsheet by link or ID,
 * validating access and ensuring the required 7 tabs are ready.
 */
export async function connectSpreadsheetByUrl(
  input: string,
  token?: string | null,
  storeName?: string
): Promise<{
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetTitle?: string;
  requiresGoogleLogin?: boolean;
}> {
  const cleanId = extractSpreadsheetId(input);
  if (!cleanId || cleanId.length < 15) {
    return {
      success: false,
      message: 'Format link tidak valid. Tempelkan link lengkap Google Spreadsheet dari address bar browser (contoh: https://docs.google.com/spreadsheets/d/.../edit).',
    };
  }

  const activeToken = token || cachedAccessToken || (await getAccessToken());
  if (!activeToken) {
    return {
      success: false,
      requiresGoogleLogin: true,
      spreadsheetId: cleanId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
      message: 'Link spreadsheet valid! Silakan login dengan Google untuk memberikan izin aplikasi menyimpan data ke lembar kerja ini.',
    };
  }

  try {
    // 1. Ensure tabs and headers exist (handles blank/new spreadsheets, renames Sheet1 to Produk, etc.)
    const structRes = await ensureSpreadsheetStructure(cleanId, activeToken, storeName);
    const title = structRes.spreadsheetTitle || 'Google Spreadsheet';
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;

    return {
      success: true,
      message: `Berhasil terhubung ke spreadsheet "${title}"! Struktur 7 lembar kerja database telah disiapkan dan siap digunakan.`,
      spreadsheetId: cleanId,
      spreadsheetUrl,
      spreadsheetTitle: title,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || `Terjadi kendala saat menghubungkan spreadsheet: ${String(err)}`,
      spreadsheetId: cleanId,
    };
  }
}

// Tab definitions and headers for Toko Bangunan database
export const SHEET_TABS = {
  PRODUK: 'Produk',
  TRANSAKSI: 'Transaksi',
  ITEM_TRANSAKSI: 'Item_Transaksi',
  PELANGGAN: 'Pelanggan',
  PEMASOK: 'Pemasok',
  PEMBELIAN: 'Pembelian',
  PENGATURAN: 'Pengaturan',
};

const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_TABS.PRODUK]: [
    'ID',
    'Kode Barang',
    'Barcode',
    'Nama Barang',
    'Kategori',
    'Satuan Dasar',
    'Harga Beli (Modal)',
    'Harga Jual (Ecer)',
    'Harga Grosir',
    'Min Grosir',
    'Stok',
    'Min Stok',
    'Lokasi Rak',
  ],
  [SHEET_TABS.TRANSAKSI]: [
    'No Invoice',
    'Tanggal & Waktu',
    'Kasir',
    'Pelanggan',
    'Metode Bayar',
    'Subtotal',
    'Diskon',
    'Pajak',
    'Grand Total',
    'Jumlah Bayar',
    'Kembalian',
    'Hutang?',
    'Sisa Hutang',
    'Status Hutang',
    'Jatuh Tempo',
    'Catatan',
  ],
  [SHEET_TABS.ITEM_TRANSAKSI]: [
    'No Invoice',
    'Tanggal',
    'Kode Barang',
    'Nama Barang',
    'Satuan',
    'Qty',
    'Harga Satuan',
    'Diskon Item',
    'Subtotal',
  ],
  [SHEET_TABS.PELANGGAN]: [
    'ID',
    'Nama Pelanggan',
    'No Telepon',
    'Alamat',
    'Kategori / Tipe',
    'Batas Hutang',
    'Total Hutang Saat Ini',
    'Tanggal Daftar',
  ],
  [SHEET_TABS.PEMASOK]: [
    'ID',
    'Nama Supplier',
    'No Telepon',
    'Alamat',
    'Kontak Person',
    'Hutang ke Supplier',
    'Info Rekening / Bank',
  ],
  [SHEET_TABS.PEMBELIAN]: [
    'ID Faktur',
    'No Faktur Toko',
    'No Faktur Supplier',
    'Supplier',
    'Tanggal',
    'Total Belanja',
    'Status Bayar',
    'Jumlah Dibayar',
    'Sisa Hutang',
    'Jatuh Tempo',
    'Kasir / Petugas',
  ],
  [SHEET_TABS.PENGATURAN]: [
    'Nama Toko',
    'Tagline',
    'Alamat',
    'No Telepon',
    'Email',
    'Footer Nota',
    'Pajak Aktif',
    'Persen Pajak',
    'Kertas Thermal',
    'Terakhir Sinkron',
  ],
};

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive with all sheets and headers pre-formatted.
 */
export async function createDatabaseSpreadsheet(
  storeName: string,
  token?: string | null
): Promise<{
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    return {
      success: false,
      message: 'Belum login ke Google. Silakan klik "Login dengan Google" terlebih dahulu.',
    };
  }

  const title = `Database POS Toko Bangunan - ${storeName || 'TB Berkah'} (${new Date().toLocaleDateString('id-ID')})`;

  try {
    const sheetsToCreate = Object.keys(SHEET_HEADERS).map((tabName) => ({
      properties: {
        title: tabName,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    }));

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
        sheets: sheetsToCreate,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return {
        success: false,
        message: `Gagal membuat spreadsheet: ${err.error?.message || `HTTP ${createRes.status}`}`,
      };
    }

    const createdData = await createRes.json();
    const newId = createdData.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${newId}/edit`;

    // Populate initial header rows for each tab
    const headerData = Object.entries(SHEET_HEADERS).map(([tabName, headers]) => ({
      range: `${tabName}!A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}1`,
      values: [headers],
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData,
      }),
    });

    return {
      success: true,
      message: `Spreadsheet database baru berhasil dibuat di Google Drive Anda!`,
      spreadsheetId: newId,
      spreadsheetUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Terjadi kesalahan saat membuat spreadsheet: ${err.message || String(err)}`,
    };
  }
}

/**
 * Ensures required 7 tabs and headers exist in a spreadsheet.
 * Specially designed to handle empty/blank spreadsheets seamlessly:
 * - If spreadsheet only has the default 'Sheet1' (or 'Lembar1'), it renames it to 'Produk' and adds the remaining 6 tabs!
 * - Freezes row 1 on all tabs.
 * - Formats header row with emerald green background and white bold font.
 * - Writes standard column headers.
 * - If the spreadsheet title is generic ('Untitled spreadsheet'), optionally renames it to store name.
 */
export async function ensureSpreadsheetStructure(
  spreadsheetId: string,
  token?: string | null,
  storeName?: string
): Promise<{
  success: boolean;
  sheetsConfigured: string[];
  spreadsheetTitle: string;
}> {
  const activeToken = token || cachedAccessToken || (await getAccessToken());
  if (!activeToken) {
    throw new Error('Otentikasi Google belum aktif. Silakan login ke Google terlebih dahulu.');
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('ID Spreadsheet tidak valid. Pastikan link spreadsheet benar.');
  }

  // 1. Fetch current spreadsheet metadata
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${metaRes.status}`;
    if (metaRes.status === 403 || metaRes.status === 401) {
      throw new Error(`Izin ditolak oleh Google (${errMsg}). Pastikan akun Google yang sedang aktif memiliki hak akses Editor pada spreadsheet ini.`);
    }
    if (metaRes.status === 404) {
      throw new Error(`File spreadsheet tidak ditemukan di Google Drive. Periksa kembali link yang Anda masukkan.`);
    }
    throw new Error(`Gagal membaca informasi spreadsheet: ${errMsg}`);
  }

  const metaData = await metaRes.json();
  const existingSheets: any[] = metaData.sheets || [];
  const existingTitles: string[] = existingSheets.map((s: any) => (s.properties?.title as string) || '');
  let currentTitle = metaData.properties?.title || 'Spreadsheet Database';

  const allRequiredTabs = Object.values(SHEET_TABS);
  const batchRequests: any[] = [];

  // Check which required tabs are already present
  const existingTitlesLower = existingTitles.map((t) => t.trim().toLowerCase());
  const hasProdukTab = existingTitlesLower.includes(SHEET_TABS.PRODUK.toLowerCase());

  // If this is an empty/new spreadsheet (e.g. default Sheet1/Lembar1 and Produk tab does not exist yet)
  if (!hasProdukTab && existingSheets.length > 0) {
    const initialSheetId = existingSheets[0].properties.sheetId;

    // Rename the initial default sheet (e.g. Sheet1) to 'Produk'
    batchRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: initialSheetId,
          title: SHEET_TABS.PRODUK,
        },
        fields: 'title',
      },
    });

    // Mark existingTitles[0] as Produk for calculating remaining missing tabs
    existingTitles[0] = SHEET_TABS.PRODUK;
  }

  // Add any remaining tabs from allRequiredTabs that are not yet in the spreadsheet
  const updatedTitlesLower = existingTitles.map((t) => t.trim().toLowerCase());
  const missingTabs = allRequiredTabs.filter(
    (tab) => !updatedTitlesLower.includes(tab.toLowerCase())
  );

  missingTabs.forEach((tabName) => {
    batchRequests.push({
      addSheet: {
        properties: {
          title: tabName,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    });
  });

  // If title is default generic title ("Untitled spreadsheet" or "Spreadsheet tanpa judul"), rename it
  if (
    storeName &&
    (!currentTitle ||
      currentTitle.toLowerCase().includes('untitled') ||
      currentTitle.toLowerCase().includes('tanpa judul') ||
      currentTitle.toLowerCase().includes('lembar kerja'))
  ) {
    const newTitle = `Database POS Toko Bangunan - ${storeName}`;
    batchRequests.push({
      updateSpreadsheetProperties: {
        properties: {
          title: newTitle,
        },
        fields: 'title',
      },
    });
    currentTitle = newTitle;
  }

  // Execute structural batchUpdate if any requests were generated
  if (batchRequests.length > 0) {
    const structRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: batchRequests }),
      }
    );

    if (!structRes.ok) {
      const err = await structRes.json().catch(() => ({}));
      throw new Error(`Gagal menyiapkan lembar kerja spreadsheet: ${err.error?.message || `HTTP ${structRes.status}`}`);
    }
  }

  // Set headers for all tabs (wrapped in single quotes for range safety)
  const headerData = Object.entries(SHEET_HEADERS).map(([tabName, headers]) => ({
    range: `'${tabName}'!A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}1`,
    values: [headers],
  }));

  const headersRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData,
      }),
    }
  );

  if (!headersRes.ok) {
    const err = await headersRes.json().catch(() => ({}));
    console.warn('Headers update warning:', err);
  }

  return {
    success: true,
    sheetsConfigured: allRequiredTabs,
    spreadsheetTitle: currentTitle,
  };
}

/**
 * Synchronize full local application state to Google Sheets
 */
export async function syncAllToGoogleSheets(
  spreadsheetId: string,
  payload: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    purchases: PurchaseInvoice[];
    settings: StoreSettings;
  },
  token?: string | null
): Promise<GoogleSheetsSyncResult> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    return {
      success: false,
      message: 'Belum login ke akun Google. Silakan klik "Login dengan Google".',
    };
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    return {
      success: false,
      message: 'ID Spreadsheet belum diisi.',
    };
  }

  try {
    await ensureSpreadsheetStructure(cleanId, activeToken);

    // Prepare rows for Produk
    const produkRows = [
      SHEET_HEADERS[SHEET_TABS.PRODUK],
      ...payload.materials.map((m) => [
        m.id,
        m.code,
        m.barcode || '',
        m.name,
        m.category,
        m.baseUnit,
        m.buyPrice,
        m.sellPrice,
        m.wholesalePrice || 0,
        m.wholesaleMinQty || 0,
        m.stock,
        m.minStock,
        m.location || '',
      ]),
    ];

    // Prepare rows for Transaksi
    const transaksiRows = [
      SHEET_HEADERS[SHEET_TABS.TRANSAKSI],
      ...payload.transactions.map((t) => [
        t.invoiceNo,
        t.date,
        t.cashierName,
        t.customerName,
        t.paymentMethod,
        t.subtotal,
        t.discountTotal,
        t.taxAmount,
        t.grandTotal,
        t.amountPaid,
        t.change,
        t.isDebt ? 'Ya' : 'Tidak',
        t.debtRemaining || 0,
        t.debtStatus || 'Lunas',
        t.debtDueDate || '',
        t.notes || '',
      ]),
    ];

    // Prepare rows for Item_Transaksi
    const itemRows = [
      SHEET_HEADERS[SHEET_TABS.ITEM_TRANSAKSI],
      ...payload.transactions.flatMap((t) =>
        t.items.map((item) => [
          t.invoiceNo,
          t.date,
          item.code,
          item.name,
          item.unit,
          item.qty,
          item.unitPrice,
          item.discount,
          item.subtotal,
        ])
      ),
    ];

    // Prepare rows for Pelanggan
    const pelangganRows = [
      SHEET_HEADERS[SHEET_TABS.PELANGGAN],
      ...payload.customers.map((c) => [
        c.id,
        c.name,
        c.phone || '',
        c.address || '',
        c.type,
        c.debtLimit,
        c.currentDebt,
        c.createdAt,
      ]),
    ];

    // Prepare rows for Pemasok
    const pemasokRows = [
      SHEET_HEADERS[SHEET_TABS.PEMASOK],
      ...payload.suppliers.map((s) => [
        s.id,
        s.name,
        s.phone || '',
        s.address || '',
        s.contactPerson || '',
        s.currentDebtToSupplier,
        s.bankInfo || '',
      ]),
    ];

    // Prepare rows for Pembelian
    const pembelianRows = [
      SHEET_HEADERS[SHEET_TABS.PEMBELIAN],
      ...payload.purchases.map((p) => [
        p.id,
        p.invoiceNo,
        p.supplierInvoiceNo || '',
        p.supplierName,
        p.date,
        p.totalAmount,
        p.paymentStatus,
        p.amountPaid,
        p.debtRemaining,
        p.dueDate || '',
        p.cashierName,
      ]),
    ];

    // Prepare rows for Pengaturan
    const pengaturanRows = [
      SHEET_HEADERS[SHEET_TABS.PENGATURAN],
      [
        payload.settings.storeName,
        payload.settings.tagline,
        payload.settings.address,
        payload.settings.phone,
        payload.settings.email,
        payload.settings.receiptFooter,
        payload.settings.taxEnabled ? 'Aktif' : 'Nonaktif',
        payload.settings.taxPercent,
        payload.settings.thermalPaperSize,
        new Date().toLocaleString('id-ID'),
      ],
    ];

    // Clear old data and write fresh rows to each tab
    const rangesToUpdate = [
      { range: `'${SHEET_TABS.PRODUK}'!A1:Z`, values: produkRows },
      { range: `'${SHEET_TABS.TRANSAKSI}'!A1:Z`, values: transaksiRows },
      { range: `'${SHEET_TABS.ITEM_TRANSAKSI}'!A1:Z`, values: itemRows },
      { range: `'${SHEET_TABS.PELANGGAN}'!A1:Z`, values: pelangganRows },
      { range: `'${SHEET_TABS.PEMASOK}'!A1:Z`, values: pemasokRows },
      { range: `'${SHEET_TABS.PEMBELIAN}'!A1:Z`, values: pembelianRows },
      { range: `'${SHEET_TABS.PENGATURAN}'!A1:Z`, values: pengaturanRows },
    ];

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: rangesToUpdate,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return {
        success: false,
        message: `Gagal memperbarui sheet: ${err.error?.message || `HTTP ${updateRes.status}`}`,
      };
    }

    return {
      success: true,
      message: `Semua data berhasil disinkronkan ke Google Spreadsheet!`,
      details: {
        materialsCount: payload.materials.length,
        customersCount: payload.customers.length,
        suppliersCount: payload.suppliers.length,
        transactionsCount: payload.transactions.length,
        purchasesCount: payload.purchases.length,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal sinkron ke Google Spreadsheet: ${err.message || String(err)}`,
    };
  }
}

/**
 * Pull latest data from Google Spreadsheet into the app
 */
export async function pullFromGoogleSheets(
  spreadsheetId: string,
  token?: string | null
): Promise<{
  success: boolean;
  message: string;
  data?: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
  };
}> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    return {
      success: false,
      message: 'Belum login ke Google. Silakan klik "Login dengan Google".',
    };
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    return {
      success: false,
      message: 'ID Spreadsheet tidak valid.',
    };
  }

  try {
    // Read sheets in batch
    const ranges = [
      `${SHEET_TABS.PRODUK}!A2:M`,
      `${SHEET_TABS.PELANGGAN}!A2:H`,
      `${SHEET_TABS.PEMASOK}!A2:G`,
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?ranges=${ranges.map(encodeURIComponent).join('&ranges=')}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: `Gagal menarik data: ${err.error?.message || `HTTP ${res.status}`}`,
      };
    }

    const batchData = await res.json();
    const valueRanges = batchData.valueRanges || [];

    // Parse Produk
    const produkValues = valueRanges[0]?.values || [];
    const materials: MaterialItem[] = produkValues
      .filter((row: any[]) => row && row[0] && row[3])
      .map((row: any[]) => ({
        id: String(row[0]),
        code: String(row[1] || ''),
        barcode: String(row[2] || ''),
        name: String(row[3] || ''),
        category: String(row[4] || 'Lain-lain'),
        baseUnit: (row[5] || 'PCS') as any,
        conversions: [],
        buyPrice: Number(row[6]) || 0,
        sellPrice: Number(row[7]) || 0,
        wholesalePrice: Number(row[8]) || 0,
        wholesaleMinQty: Number(row[9]) || 0,
        stock: Number(row[10]) || 0,
        minStock: Number(row[11]) || 5,
        location: String(row[12] || ''),
      }));

    // Parse Pelanggan
    const pelangganValues = valueRanges[1]?.values || [];
    const customers: Customer[] = pelangganValues
      .filter((row: any[]) => row && row[0] && row[1])
      .map((row: any[]) => ({
        id: String(row[0]),
        name: String(row[1] || ''),
        phone: String(row[2] || ''),
        address: String(row[3] || ''),
        type: (row[4] || 'Umum') as any,
        debtLimit: Number(row[5]) || 0,
        currentDebt: Number(row[6]) || 0,
        createdAt: String(row[7] || new Date().toISOString().split('T')[0]),
      }));

    // Parse Pemasok
    const pemasokValues = valueRanges[2]?.values || [];
    const suppliers: Supplier[] = pemasokValues
      .filter((row: any[]) => row && row[0] && row[1])
      .map((row: any[]) => ({
        id: String(row[0]),
        name: String(row[1] || ''),
        phone: String(row[2] || ''),
        address: String(row[3] || ''),
        contactPerson: String(row[4] || ''),
        currentDebtToSupplier: Number(row[5]) || 0,
        bankInfo: String(row[6] || ''),
      }));

    return {
      success: true,
      message: `Berhasil menarik ${materials.length} barang, ${customers.length} pelanggan, dan ${suppliers.length} pemasok dari spreadsheet!`,
      data: { materials, customers, suppliers },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal membaca spreadsheet: ${err.message || String(err)}`,
    };
  }
}

/**
 * Append a newly completed transaction and its items to Google Sheets
 */
export async function appendTransactionToGoogleSheets(
  spreadsheetId: string,
  tx: Transaction,
  token?: string | null
): Promise<boolean> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) return false;

  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return false;

  try {
    const txRow = [
      tx.invoiceNo,
      tx.date,
      tx.cashierName,
      tx.customerName,
      tx.paymentMethod,
      tx.subtotal,
      tx.discountTotal,
      tx.taxAmount,
      tx.grandTotal,
      tx.amountPaid,
      tx.change,
      tx.isDebt ? 'Ya' : 'Tidak',
      tx.debtRemaining || 0,
      tx.debtStatus || 'Lunas',
      tx.debtDueDate || '',
      tx.notes || '',
    ];

    const itemRows = tx.items.map((item) => [
      tx.invoiceNo,
      tx.date,
      item.code,
      item.name,
      item.unit,
      item.qty,
      item.unitPrice,
      item.discount,
      item.subtotal,
    ]);

    // Append to Transaksi
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${SHEET_TABS.TRANSAKSI}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [txRow] }),
      }
    );

    // Append to Item_Transaksi
    if (itemRows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${SHEET_TABS.ITEM_TRANSAKSI}!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: itemRows }),
        }
      );
    }

    return true;
  } catch (err) {
    console.warn('Auto-append transaction error:', err);
    return false;
  }
}

/**
 * Optional Google Apps Script Webhook payload sender
 */
export async function sendToAppsScriptWebhook(
  webhookUrl: string,
  action: 'sync_all' | 'append_transaction' | 'update_product' | 'ping' | 'pull',
  payload: any
): Promise<{ success: boolean; message: string; data?: any }> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl) {
    return { success: false, message: 'URL Webhook belum diisi.' };
  }

  try {
    // 1. Try backend proxy first to follow 302 redirects without browser CORS issues
    try {
      const proxyRes = await fetch('/api/sheets/webhook-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cleanUrl, action, payload }),
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        return proxyData;
      }
    } catch {
      // Fallback to direct fetch
    }

    // 2. Direct fetch as fallback
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, timestamp: new Date().toISOString(), payload }),
    });

    if (!res.ok) {
      return { success: false, message: `Webhook error: HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => ({ success: true, message: 'Berhasil dikirim ke Webhook' }));
    return {
      success: data.success !== false,
      message: data.message || 'Data berhasil dikirim ke Google Apps Script Webhook',
      data: data.data || data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Webhook: ${err.message || String(err)}`,
    };
  }
}

/**
 * Ping test to Google Apps Script Webhook
 */
export async function pingAppsScriptWebhook(
  webhookUrl: string
): Promise<{ success: boolean; message: string }> {
  return await sendToAppsScriptWebhook(webhookUrl, 'ping', {});
}

/**
 * Google Apps Script Template code that users can copy-paste into script.google.com
 */
export const APPS_SCRIPT_TEMPLATE_CODE = `/**
 * ====================================================================
 * GOOGLE APPS SCRIPT WEBHOOK - KASIR POS TOKO BANGUNAN (MODE SIMPLE)
 * ====================================================================
 * Petunjuk Pemasangan 3 Langkah Cepat:
 * 1. Buka Google Spreadsheet baru (sheets.new)
 * 2. Di Spreadsheet, klik menu: "Ekstensi" (Extensions) -> "Apps Script"
 * 3. Hapus kode bawaan, tempel SELURUH KODE ini.
 * 4. Klik tombol biru "Deploy" (Terapkan) -> "New deployment" (Penerapan baru)
 * 5. Pilih jenis: "Web app" (Aplikasi Web)
 *    - Execute as: "Me" (Saya)
 *    - Who has access: "Anyone" (Siapa saja)
 * 6. Klik "Deploy", beri izin Google jika diminta, lalu salin URL Web App yang didapat
 *    (berakhiran /exec) dan tempel ke Aplikasi POS Kasir Anda!
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Apps Script Webhook POS Toko Bangunan Aktif & Siap Menerima Data!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var action = data.action || "ping";
    var payload = data.payload || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Uji Ping Koneksi
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Koneksi Google Spreadsheet Webhook Berhasil! (" + ss.getName() + ")"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Simpan Transaksi Otomatis (Realtime Auto-Sync Kasir)
    if (action === "append_transaction") {
      var txSheet = getOrCreateSheetWithHeaders(ss, "Transaksi", [
        "No Invoice", "Tanggal", "Nama Kasir", "Nama Pelanggan", "Metode Bayar",
        "Subtotal", "Diskon", "PPN", "Grand Total", "Jumlah Bayar", "Kembalian",
        "Hutang?", "Sisa Hutang", "Status Hutang", "Jatuh Tempo", "Catatan"
      ]);

      var itemSheet = getOrCreateSheetWithHeaders(ss, "Item_Transaksi", [
        "No Invoice", "Tanggal", "Kode Barang", "Nama Barang", "Satuan",
        "Qty", "Harga Satuan", "Diskon Item", "Subtotal"
      ]);

      var tx = payload;
      txSheet.appendRow([
        tx.invoiceNo || "",
        tx.date || new Date().toISOString(),
        tx.cashierName || "Kasir",
        tx.customerName || "Pelanggan Umum",
        tx.paymentMethod || "Tunai",
        tx.subtotal || 0,
        tx.discountTotal || 0,
        tx.taxAmount || 0,
        tx.grandTotal || 0,
        tx.amountPaid || 0,
        tx.change || 0,
        tx.isDebt ? "Ya" : "Tidak",
        tx.debtRemaining || 0,
        tx.debtStatus || "Lunas",
        tx.debtDueDate || "",
        tx.notes || ""
      ]);

      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach(function(item) {
          itemSheet.appendRow([
            tx.invoiceNo || "",
            tx.date || new Date().toISOString(),
            item.code || "",
            item.name || "",
            item.unit || "PCS",
            item.qty || 1,
            item.unitPrice || 0,
            item.discount || 0,
            item.subtotal || 0
          ]);
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Transaksi " + (tx.invoiceNo || "") + " berhasil dicatat di Spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Sinkronkan Seluruh Data (Produk, Pelanggan, Supplier, Transaksi)
    if (action === "sync_all") {
      // Sync Produk
      if (payload.materials && Array.isArray(payload.materials)) {
        var prodSheet = getOrCreateSheetWithHeaders(ss, "Produk", [
          "ID", "Kode", "Barcode", "Nama Barang", "Kategori", "Satuan Dasar",
          "Harga Beli", "Harga Jual", "Harga Grosir", "Stok", "Min Stok", "Lokasi Rak"
        ]);
        clearDataRows(prodSheet);
        var prodRows = payload.materials.map(function(m) {
          return [
            m.id, m.code, m.barcode || "", m.name, m.category, m.baseUnit,
            m.buyPrice || 0, m.sellPrice || 0, m.wholesalePrice || 0,
            m.stock || 0, m.minStock || 0, m.location || ""
          ];
        });
        if (prodRows.length > 0) {
          prodSheet.getRange(2, 1, prodRows.length, prodRows[0].length).setValues(prodRows);
        }
      }

      // Sync Pelanggan
      if (payload.customers && Array.isArray(payload.customers)) {
        var custSheet = getOrCreateSheetWithHeaders(ss, "Pelanggan", [
          "ID", "Nama Pelanggan", "Telepon", "Alamat", "Tipe", "Limit Hutang", "Hutang Saat Ini"
        ]);
        clearDataRows(custSheet);
        var custRows = payload.customers.map(function(c) {
          return [
            c.id, c.name, c.phone || "", c.address || "", c.type || "Umum",
            c.debtLimit || 0, c.currentDebt || 0
          ];
        });
        if (custRows.length > 0) {
          custSheet.getRange(2, 1, custRows.length, custRows[0].length).setValues(custRows);
        }
      }

      // Sync Supplier
      if (payload.suppliers && Array.isArray(payload.suppliers)) {
        var supSheet = getOrCreateSheetWithHeaders(ss, "Supplier", [
          "ID", "Nama Supplier", "Telepon", "Alamat", "Kontak Person", "Hutang ke Supplier", "Info Bank"
        ]);
        clearDataRows(supSheet);
        var supRows = payload.suppliers.map(function(s) {
          return [
            s.id, s.name, s.phone || "", s.address || "", s.contactPerson || "",
            s.currentDebtToSupplier || 0, s.bankInfo || ""
          ];
        });
        if (supRows.length > 0) {
          supSheet.getRange(2, 1, supRows.length, supRows[0].length).setValues(supRows);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Seluruh data toko berhasil disinkronkan ke Google Spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Aksi " + action + " diproses."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error Apps Script: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheetWithHeaders(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E8F5E9");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
}
`;
