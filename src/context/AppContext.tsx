import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  MaterialItem,
  Customer,
  Supplier,
  Transaction,
  PurchaseInvoice,
  StockMovement,
  StoreSettings,
  User,
  DebtPayment,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_MATERIALS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_TRANSACTIONS,
  INITIAL_PURCHASES,
  INITIAL_STOCK_MOVEMENTS,
} from '../data/mockData';
import { generateInvoiceNo } from '../utils/formatter';
import { applyThemeToDocument } from '../utils/theme';
import {
  isSupabaseConfigured,
  syncLocalToSupabase,
  pullFromSupabase,
  testSupabaseConnection,
  SupabaseSyncResult,
  supabase,
} from '../lib/supabase';
import {
  initGoogleAuth,
  subscribeGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
  createDatabaseSpreadsheet,
  syncAllToGoogleSheets,
  pullFromGoogleSheets,
  appendTransactionToGoogleSheets,
  sendToAppsScriptWebhook,
  pingAppsScriptWebhook,
  connectSpreadsheetByUrl,
  GoogleSheetsSyncResult,
} from '../lib/googleSheets';
import {
  syncAllToFirebase,
} from '../lib/firebaseDatabase';
import {
  DEFAULT_MYSQL_CONFIG,
  testMySqlConnection,
  initMySqlTables,
  syncAllToMySql,
  pullFromMySql,
  MySqlTestResult,
  MySqlSyncResult,
} from '../lib/mysql';
import { User as FirebaseUser } from 'firebase/auth';
import { SupabaseConfigState, MySqlConfigState } from '../types';

interface AppContextType {
  // Auth state
  isAuthenticated: boolean;
  login: (u: User) => void;
  logout: () => void;

  currentUser: User;
  setCurrentUser: (u: User) => void;
  users: User[];
  addUser: (u: Omit<User, 'id'>) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  settings: StoreSettings;
  updateSettings: (s: Partial<StoreSettings>) => void;

  materials: MaterialItem[];
  addMaterial: (m: Omit<MaterialItem, 'id'>) => MaterialItem;
  updateMaterial: (id: string, m: Partial<MaterialItem>) => void;
  deleteMaterial: (id: string) => void;

  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'currentDebt'>) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  recordCustomerDebtPayment: (payment: {
    transactionId?: string;
    customerId: string;
    amount: number;
    paymentMethod: 'Tunai' | 'Transfer' | 'QRIS';
    notes?: string;
  }) => void;

  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, 'id' | 'currentDebtToSupplier'>) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  recordSupplierDebtPayment: (supplierId: string, amount: number, notes?: string) => void;

  transactions: Transaction[];
  recordTransaction: (txData: Omit<Transaction, 'id' | 'invoiceNo' | 'date'>) => Transaction;

  purchases: PurchaseInvoice[];
  recordPurchase: (poData: Omit<PurchaseInvoice, 'id' | 'invoiceNo' | 'date'>) => PurchaseInvoice;

  stockMovements: StockMovement[];
  recordStockAdjustment: (materialId: string, physicalCount: number, reason: string) => void;

  // Google Sheets integration state & methods
  googleUser: FirebaseUser | null;
  googleAccessToken: string | null;
  isGoogleConnected: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; user?: FirebaseUser; token?: string; error?: string; cancelled?: boolean }>;
  logoutGoogle: () => Promise<void>;
  syncToGoogleSheets: (targetSpreadsheetId?: string) => Promise<GoogleSheetsSyncResult>;
  pullFromGoogleSheetsData: (targetSpreadsheetId?: string) => Promise<{ success: boolean; message: string }>;
  createAndConnectSpreadsheet: (storeNameCustom?: string) => Promise<{ success: boolean; message: string; spreadsheetUrl?: string; spreadsheetId?: string }>;
  connectExistingSpreadsheet: (urlOrId: string, customToken?: string) => Promise<{ success: boolean; message: string; spreadsheetUrl?: string; spreadsheetId?: string; spreadsheetTitle?: string; requiresGoogleLogin?: boolean }>;
  testGoogleWebhook: (webhookUrl?: string) => Promise<{ success: boolean; message: string }>;

  // Firebase Database state & methods
  syncToFirebaseDb: () => Promise<{ success: boolean; message: string }>;

  // MySQL Localhost Database state & methods
  mysqlConfig: MySqlConfigState;
  updateMySqlConfig: (cfg: Partial<MySqlConfigState>) => void;
  testMySqlDb: (customConfig?: MySqlConfigState) => Promise<MySqlTestResult>;
  initMySqlDbTables: (customConfig?: MySqlConfigState) => Promise<{ success: boolean; message: string; tables?: string[] }>;
  syncToMySqlDb: (customConfig?: MySqlConfigState) => Promise<MySqlSyncResult>;
  pullFromMySqlDb: (customConfig?: MySqlConfigState) => Promise<{ success: boolean; message: string }>;

  // Supabase Database state & methods
  isSupabaseActive: boolean;
  syncToSupabase: (customConfig?: SupabaseConfigState) => Promise<SupabaseSyncResult>;
  pullFromSupabaseData: (customConfig?: SupabaseConfigState) => Promise<{ success: boolean; message: string }>;

  playBeep: () => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'pos_mat_users',
  SETTINGS: 'pos_mat_settings',
  MATERIALS: 'pos_mat_materials',
  CUSTOMERS: 'pos_mat_customers',
  SUPPLIERS: 'pos_mat_suppliers',
  TRANSACTIONS: 'pos_mat_transactions',
  PURCHASES: 'pos_mat_purchases',
  STOCK_MOVEMENTS: 'pos_mat_stock_movements',
  CURRENT_USER: 'pos_mat_current_user',
  IS_AUTHENTICATED: 'pos_mat_is_authenticated',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
  }
  return fallback;
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState<User>(() =>
    loadStorage(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[2]) // Default to Siti Rahma (Kasir)
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadStorage(STORAGE_KEYS.IS_AUTHENTICATED, false) // Prompt login on fresh state
  );
  const [settings, setSettings] = useState<StoreSettings>(() =>
    loadStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  );
  const [materials, setMaterials] = useState<MaterialItem[]>(() =>
    loadStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS)
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS)
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
  );
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(() =>
    loadStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES)
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    loadStorage(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS)
  );

  // Apply application color theme dynamically
  useEffect(() => {
    applyThemeToDocument(settings.themeColor || 'emerald');
  }, [settings.themeColor]);

  // Sync to localStorage
  useEffect(() => saveStorage(STORAGE_KEYS.USERS, users), [users]);
  useEffect(() => saveStorage(STORAGE_KEYS.CURRENT_USER, currentUser), [currentUser]);
  useEffect(() => saveStorage(STORAGE_KEYS.IS_AUTHENTICATED, isAuthenticated), [isAuthenticated]);
  useEffect(() => saveStorage(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => saveStorage(STORAGE_KEYS.MATERIALS, materials), [materials]);
  useEffect(() => saveStorage(STORAGE_KEYS.CUSTOMERS, customers), [customers]);
  useEffect(() => saveStorage(STORAGE_KEYS.SUPPLIERS, suppliers), [suppliers]);
  useEffect(() => saveStorage(STORAGE_KEYS.TRANSACTIONS, transactions), [transactions]);
  useEffect(() => saveStorage(STORAGE_KEYS.PURCHASES, purchases), [purchases]);
  useEffect(() => saveStorage(STORAGE_KEYS.STOCK_MOVEMENTS, stockMovements), [stockMovements]);

  // Check Supabase session on mount
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          setIsAuthenticated(true);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch((err) => console.warn('Supabase signOut warning:', err));
    }
  };

  // Google Auth & Sheets State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    initGoogleAuth();
    const unsub = subscribeGoogleAuth((u, token) => {
      setGoogleUser(u);
      setGoogleAccessToken(token);
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = async (): Promise<{
    success: boolean;
    user?: FirebaseUser;
    token?: string;
    error?: string;
    cancelled?: boolean;
  }> => {
    try {
      const res = await signInWithGoogle();
      if (!res) {
        return {
          success: false,
          cancelled: true,
          error: 'Jendela login Google ditutup sebelum otentikasi selesai.',
        };
      }
      setGoogleUser(res.user);
      setGoogleAccessToken(res.accessToken);
      return {
        success: true,
        user: res.user,
        token: res.accessToken,
      };
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return {
          success: false,
          cancelled: true,
          error: 'Jendela login Google ditutup sebelum otentikasi selesai.',
        };
      }
      let errMsg = err?.message || 'Login ke akun Google gagal.';
      if (err?.code === 'auth/popup-blocked') {
        errMsg = 'Jendela popup Google diblokir browser. Harap izinkan popup di pengaturan browser Anda.';
      }
      return {
        success: false,
        error: errMsg,
      };
    }
  };

  const logoutGoogle = async (): Promise<void> => {
    await signOutGoogle();
    setGoogleUser(null);
    setGoogleAccessToken(null);
  };

  const createAndConnectSpreadsheet = async (storeNameCustom?: string) => {
    const res = await createDatabaseSpreadsheet(
      storeNameCustom || settings.storeName,
      googleAccessToken
    );
    if (res.success && res.spreadsheetId) {
      setSettings((prev) => ({
        ...prev,
        googleSheetsConfig: {
          enabled: true,
          spreadsheetId: res.spreadsheetId!,
          spreadsheetUrl: res.spreadsheetUrl,
          spreadsheetName: `Database POS - ${storeNameCustom || prev.storeName}`,
          autoSync: true,
          lastSync: new Date().toLocaleString('id-ID'),
          webhookUrl: prev.googleSheetsConfig?.webhookUrl,
        },
      }));
    }
    return res;
  };

  const connectExistingSpreadsheet = async (urlOrId: string, customToken?: string) => {
    const activeTok = customToken || googleAccessToken || (await getAccessToken());
    const res = await connectSpreadsheetByUrl(urlOrId, activeTok, settings.storeName);
    if (res.success && res.spreadsheetId) {
      const cleanId = res.spreadsheetId;
      // Automatically sync current local data into the newly connected spreadsheet so it is immediately filled!
      await syncAllToGoogleSheets(
        cleanId,
        {
          materials,
          customers,
          suppliers,
          transactions,
          purchases,
          settings,
        },
        activeTok
      ).catch((e) => console.warn('Initial data sync warning:', e));

      setSettings((prev) => ({
        ...prev,
        googleSheetsConfig: {
          enabled: true,
          spreadsheetId: cleanId,
          spreadsheetUrl: res.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
          spreadsheetName: res.spreadsheetTitle || `Database POS`,
          autoSync: true,
          lastSync: new Date().toLocaleString('id-ID'),
          webhookUrl: prev.googleSheetsConfig?.webhookUrl,
        },
      }));
    }
    return res;
  };

  const syncToGoogleSheets = useCallback(
    async (targetSpreadsheetId?: string): Promise<GoogleSheetsSyncResult> => {
      const idToUse = targetSpreadsheetId || settings.googleSheetsConfig?.spreadsheetId;
      const webhookUrl = settings.googleSheetsConfig?.webhookUrl;

      // 1. If Webhook URL is configured and user is not logged in with Google OAuth, sync via Webhook directly!
      if (webhookUrl && !googleAccessToken) {
        const webhookRes = await sendToAppsScriptWebhook(webhookUrl, 'sync_all', {
          materials,
          customers,
          suppliers,
          transactions,
          purchases,
          settings,
        });

        if (webhookRes.success) {
          setSettings((prev) => ({
            ...prev,
            googleSheetsConfig: {
              ...(prev.googleSheetsConfig || {
                enabled: true,
                autoSync: true,
                spreadsheetId: idToUse || '',
              }),
              lastSync: new Date().toLocaleString('id-ID'),
            },
          }));
          return {
            success: true,
            message: webhookRes.message || 'Seluruh data berhasil disinkronkan ke Google Spreadsheet via Simple Webhook!',
          };
        }
      }

      if (!idToUse) {
        return {
          success: false,
          message: 'ID Spreadsheet atau URL Webhook belum diisi. Silakan pilih atau buat spreadsheet baru.',
        };
      }

      const res = await syncAllToGoogleSheets(
        idToUse,
        {
          materials,
          customers,
          suppliers,
          transactions,
          purchases,
          settings,
        },
        googleAccessToken
      );

      if (res.success) {
        setSettings((prev) => ({
          ...prev,
          googleSheetsConfig: {
            ...(prev.googleSheetsConfig || {
              enabled: true,
              autoSync: true,
            }),
            spreadsheetId: idToUse,
            lastSync: new Date().toLocaleString('id-ID'),
          },
        }));
      }

      if (webhookUrl) {
        sendToAppsScriptWebhook(webhookUrl, 'sync_all', {
          materials,
          customers,
          suppliers,
          transactions,
          purchases,
          settings,
        }).catch((e) => console.warn('Webhook sync error:', e));
      }

      return res;
    },
    [materials, customers, suppliers, transactions, purchases, settings, googleAccessToken]
  );

  const testGoogleWebhook = useCallback(
    async (customUrl?: string): Promise<{ success: boolean; message: string }> => {
      const urlToUse = (customUrl || settings.googleSheetsConfig?.webhookUrl || '').trim();
      if (!urlToUse) {
        return { success: false, message: 'URL Webhook Google Apps Script belum diisi.' };
      }
      return await pingAppsScriptWebhook(urlToUse);
    },
    [settings.googleSheetsConfig?.webhookUrl]
  );

  const pullFromGoogleSheetsData = useCallback(
    async (targetSpreadsheetId?: string): Promise<{ success: boolean; message: string }> => {
      const idToUse = targetSpreadsheetId || settings.googleSheetsConfig?.spreadsheetId;
      if (!idToUse) {
        return {
          success: false,
          message: 'ID Spreadsheet belum ditentukan.',
        };
      }

      const res = await pullFromGoogleSheets(idToUse, googleAccessToken);
      if (res.success && res.data) {
        if (res.data.materials && res.data.materials.length > 0) {
          setMaterials(res.data.materials);
        }
        if (res.data.customers && res.data.customers.length > 0) {
          setCustomers(res.data.customers);
        }
        if (res.data.suppliers && res.data.suppliers.length > 0) {
          setSuppliers(res.data.suppliers);
        }
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message };
    },
    [settings.googleSheetsConfig?.spreadsheetId, googleAccessToken]
  );

  const syncToFirebaseDb = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    return await syncAllToFirebase(
      {
        materials,
        customers,
        suppliers,
        transactions,
        purchases,
        settings,
      },
      settings.firebaseConfig
    );
  }, [materials, customers, suppliers, transactions, purchases, settings]);

  // Sync local data to Supabase
  const syncToSupabase = useCallback(async (customConfig?: SupabaseConfigState): Promise<SupabaseSyncResult> => {
    return await syncLocalToSupabase({
      materials,
      customers,
      suppliers,
      transactions,
      purchases,
      settings,
    }, customConfig || settings.supabaseConfig);
  }, [materials, customers, suppliers, transactions, purchases, settings]);

  // Pull latest data from Supabase
  const pullFromSupabaseData = useCallback(async (customConfig?: SupabaseConfigState): Promise<{ success: boolean; message: string }> => {
    const res = await pullFromSupabase(customConfig || settings.supabaseConfig);
    if (res.success && res.data) {
      if (res.data.materials && res.data.materials.length > 0) {
        setMaterials(res.data.materials);
      }
      if (res.data.customers && res.data.customers.length > 0) {
        setCustomers(res.data.customers);
      }
      if (res.data.suppliers && res.data.suppliers.length > 0) {
        setSuppliers(res.data.suppliers);
      }
      if (res.data.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
      }
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  }, [settings.supabaseConfig]);

  // MySQL Localhost Database methods
  const mysqlConfig = settings.mysqlConfig || DEFAULT_MYSQL_CONFIG;

  const updateMySqlConfig = useCallback((cfg: Partial<MySqlConfigState>) => {
    setSettings((prev) => {
      const updated: StoreSettings = {
        ...prev,
        mysqlConfig: {
          ...(prev.mysqlConfig || DEFAULT_MYSQL_CONFIG),
          ...cfg,
        },
      };
      saveStorage(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    });
  }, []);

  const testMySqlDb = useCallback(
    async (customConfig?: MySqlConfigState): Promise<MySqlTestResult> => {
      const cfgToUse = customConfig || settings.mysqlConfig || DEFAULT_MYSQL_CONFIG;
      const res = await testMySqlConnection(cfgToUse);
      if (res.success) {
        updateMySqlConfig({ status: 'connected', lastSync: new Date().toISOString() });
      } else {
        updateMySqlConfig({ status: 'error' });
      }
      return res;
    },
    [settings.mysqlConfig, updateMySqlConfig]
  );

  const initMySqlDbTables = useCallback(
    async (customConfig?: MySqlConfigState): Promise<{ success: boolean; message: string; tables?: string[] }> => {
      const cfgToUse = customConfig || settings.mysqlConfig || DEFAULT_MYSQL_CONFIG;
      return await initMySqlTables(cfgToUse);
    },
    [settings.mysqlConfig]
  );

  const syncToMySqlDb = useCallback(
    async (customConfig?: MySqlConfigState): Promise<MySqlSyncResult> => {
      const cfgToUse = customConfig || settings.mysqlConfig || DEFAULT_MYSQL_CONFIG;
      const res = await syncAllToMySql(cfgToUse, {
        materials,
        customers,
        suppliers,
        transactions,
        settings,
      });
      if (res.success) {
        updateMySqlConfig({ status: 'connected', lastSync: new Date().toISOString() });
      }
      return res;
    },
    [materials, customers, suppliers, transactions, settings, updateMySqlConfig]
  );

  const pullFromMySqlDb = useCallback(
    async (customConfig?: MySqlConfigState): Promise<{ success: boolean; message: string }> => {
      const cfgToUse = customConfig || settings.mysqlConfig || DEFAULT_MYSQL_CONFIG;
      const res = await pullFromMySql(cfgToUse);
      if (res.success && res.data) {
        if (res.data.materials && res.data.materials.length > 0) {
          setMaterials(res.data.materials);
        }
        if (res.data.customers && res.data.customers.length > 0) {
          setCustomers(res.data.customers);
        }
        if (res.data.suppliers && res.data.suppliers.length > 0) {
          setSuppliers(res.data.suppliers);
        }
        if (res.data.transactions && res.data.transactions.length > 0) {
          setTransactions(res.data.transactions);
        }
        if (res.data.settings) {
          setSettings((prev) => ({ ...prev, ...res.data.settings }));
        }
        updateMySqlConfig({ status: 'connected', lastSync: new Date().toISOString() });
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message };
    },
    [settings.mysqlConfig, updateMySqlConfig]
  );

  // Audio beep
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore audio errors
    }
  };

  // User methods
  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...userData } : u)));
    if (currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...userData }));
    }
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Materials
  const addMaterial = (matData: Omit<MaterialItem, 'id'>): MaterialItem => {
    const newId = `MAT-${String(materials.length + 1).padStart(3, '0')}`;
    const newMaterial: MaterialItem = {
      ...matData,
      id: newId,
    };
    setMaterials((prev) => [newMaterial, ...prev]);

    // Record initial stock movement if stock > 0
    if (matData.stock > 0) {
      const movement: StockMovement = {
        id: `SM-${Date.now()}`,
        date: new Date().toISOString(),
        materialId: newId,
        materialName: matData.name,
        type: 'INITIAL',
        qtyChange: matData.stock,
        unit: matData.baseUnit,
        previousStock: 0,
        newStock: matData.stock,
        notes: 'Stok awal barang baru',
        operator: currentUser.name,
      };
      setStockMovements((prev) => [movement, ...prev]);
    }
    return newMaterial;
  };

  const updateMaterial = (id: string, matData: Partial<MaterialItem>) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...matData } : m))
    );
  };

  const deleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Customers
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt' | 'currentDebt'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      currentDebt: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [...prev, newCust]);
    return newCust;
  };

  const updateCustomer = (id: string, custData: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...custData } : c))
    );
  };

  const recordCustomerDebtPayment = (payment: {
    transactionId?: string;
    customerId: string;
    amount: number;
    paymentMethod: 'Tunai' | 'Transfer' | 'QRIS';
    notes?: string;
  }) => {
    const customer = customers.find((c) => c.id === payment.customerId);
    if (!customer) return;

    // Reduce customer debt
    const newDebt = Math.max(0, customer.currentDebt - payment.amount);
    updateCustomer(customer.id, { currentDebt: newDebt });

    // Update matching transaction debt if transactionId given, or oldest unpaid transactions
    if (payment.transactionId) {
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.id === payment.transactionId) {
            const currentRem = t.debtRemaining || 0;
            const newRem = Math.max(0, currentRem - payment.amount);
            return {
              ...t,
              debtRemaining: newRem,
              debtStatus: newRem === 0 ? 'Lunas' : 'Sebagian',
            };
          }
          return t;
        })
      );
    } else {
      // Allocate payment to oldest unpaid customer transactions
      let remainingPayment = payment.amount;
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.customerId === payment.customerId && t.isDebt && (t.debtRemaining || 0) > 0 && remainingPayment > 0) {
            const curRem = t.debtRemaining || 0;
            const deduct = Math.min(remainingPayment, curRem);
            remainingPayment -= deduct;
            const newRem = curRem - deduct;
            return {
              ...t,
              debtRemaining: newRem,
              debtStatus: newRem === 0 ? 'Lunas' : 'Sebagian',
            };
          }
          return t;
        })
      );
    }
  };

  // Suppliers
  const addSupplier = (supData: Omit<Supplier, 'id' | 'currentDebtToSupplier'>): Supplier => {
    const newSup: Supplier = {
      ...supData,
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      currentDebtToSupplier: 0,
    };
    setSuppliers((prev) => [...prev, newSup]);
    return newSup;
  };

  const updateSupplier = (id: string, supData: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...supData } : s))
    );
  };

  const recordSupplierDebtPayment = (supplierId: string, amount: number, _notes?: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    const newDebt = Math.max(0, supplier.currentDebtToSupplier - amount);
    updateSupplier(supplier.id, { currentDebtToSupplier: newDebt });

    // Also update purchase invoices for this supplier
    let rem = amount;
    setPurchases((prev) =>
      prev.map((p) => {
        if (p.supplierId === supplierId && p.debtRemaining > 0 && rem > 0) {
          const deduct = Math.min(rem, p.debtRemaining);
          rem -= deduct;
          const newDebtRemaining = p.debtRemaining - deduct;
          return {
            ...p,
            debtRemaining: newDebtRemaining,
            amountPaid: p.amountPaid + deduct,
            paymentStatus: newDebtRemaining === 0 ? 'Lunas' : 'Hutang',
          };
        }
        return p;
      })
    );
  };

  // Transactions (POS Checkout)
  const recordTransaction = (
    txData: Omit<Transaction, 'id' | 'invoiceNo' | 'date'>
  ): Transaction => {
    const todayCount = transactions.filter((t) => {
      const todayStr = new Date().toISOString().split('T')[0];
      return t.date.startsWith(todayStr);
    }).length;

    const newInvoiceNo = generateInvoiceNo('TB', todayCount + 1);
    const newTx: Transaction = {
      ...txData,
      id: `TRX-${Date.now()}`,
      invoiceNo: newInvoiceNo,
      date: new Date().toISOString(),
    };

    // Deduct stock for each sold item and record stock movement
    setMaterials((prevMaterials) => {
      return prevMaterials.map((mat) => {
        const soldItem = txData.items.find((item) => item.materialId === mat.id);
        if (soldItem) {
          const newStock = Math.max(0, mat.stock - soldItem.baseQty);
          // Stock movement
          const movement: StockMovement = {
            id: `SM-${Date.now()}-${mat.id}`,
            date: new Date().toISOString(),
            materialId: mat.id,
            materialName: mat.name,
            type: 'OUT_SALE',
            qtyChange: -soldItem.baseQty,
            unit: mat.baseUnit,
            previousStock: mat.stock,
            newStock: newStock,
            notes: `Penjualan ${newInvoiceNo} (${txData.customerName})`,
            refNo: newInvoiceNo,
            operator: currentUser.name,
          };
          setStockMovements((prevMovements) => [movement, ...prevMovements]);
          return { ...mat, stock: newStock };
        }
        return mat;
      });
    });

    // If transaction is debt, update customer's currentDebt
    if (txData.isDebt && txData.customerId && (txData.debtRemaining || 0) > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === txData.customerId
            ? { ...c, currentDebt: c.currentDebt + (txData.debtRemaining || 0) }
            : c
        )
      );
    }

    setTransactions((prev) => [newTx, ...prev]);
    playBeep();

    // Realtime Auto-sync to Google Sheets if enabled
    const gConfig = settings.googleSheetsConfig;
    if (gConfig?.enabled && gConfig.spreadsheetId && gConfig.autoSync !== false) {
      appendTransactionToGoogleSheets(gConfig.spreadsheetId, newTx, googleAccessToken).catch((err) => {
        console.warn('Auto-append transaction to sheets failed:', err);
      });
    }
    if (gConfig?.enabled && gConfig.webhookUrl) {
      sendToAppsScriptWebhook(gConfig.webhookUrl, 'append_transaction', newTx).catch((err) => {
        console.warn('Auto-append webhook failed:', err);
      });
    }

    // Realtime Auto-sync to MySQL Localhost if enabled
    const mConfig = settings.mysqlConfig || DEFAULT_MYSQL_CONFIG;
    if (mConfig.enabled && mConfig.autoSync !== false) {
      syncAllToMySql(mConfig, {
        materials,
        customers,
        suppliers,
        transactions: [newTx, ...transactions],
        settings,
      }).catch((err) => {
        console.warn('Auto-sync to MySQL failed:', err);
      });
    }

    return newTx;
  };

  // Purchase (Barang Masuk / Pembelian Supplier)
  const recordPurchase = (
    poData: Omit<PurchaseInvoice, 'id' | 'invoiceNo' | 'date'>
  ): PurchaseInvoice => {
    const todayCount = purchases.filter((p) => {
      const todayStr = new Date().toISOString().split('T')[0];
      return p.date.startsWith(todayStr);
    }).length;

    const newInvoiceNo = generateInvoiceNo('PO', todayCount + 1);
    const newPo: PurchaseInvoice = {
      ...poData,
      id: `PO-${Date.now()}`,
      invoiceNo: newInvoiceNo,
      date: new Date().toISOString(),
    };

    // Add stock for each purchased item
    setMaterials((prevMaterials) => {
      return prevMaterials.map((mat) => {
        const purchasedItem = poData.items.find((item) => item.materialId === mat.id);
        if (purchasedItem) {
          const newStock = mat.stock + purchasedItem.qty;
          const movement: StockMovement = {
            id: `SM-${Date.now()}-${mat.id}`,
            date: new Date().toISOString(),
            materialId: mat.id,
            materialName: mat.name,
            type: 'IN_PURCHASE',
            qtyChange: purchasedItem.qty,
            unit: purchasedItem.unit,
            previousStock: mat.stock,
            newStock: newStock,
            notes: `Faktur Masuk ${newInvoiceNo} (${poData.supplierName})`,
            refNo: newInvoiceNo,
            operator: currentUser.name,
          };
          setStockMovements((prevMovements) => [movement, ...prevMovements]);
          return { ...mat, stock: newStock, buyPrice: purchasedItem.buyPrice };
        }
        return mat;
      });
    });

    // If debt, increase supplier debt
    if (poData.debtRemaining > 0) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === poData.supplierId
            ? { ...s, currentDebtToSupplier: s.currentDebtToSupplier + poData.debtRemaining }
            : s
        )
      );
    }

    setPurchases((prev) => [newPo, ...prev]);
    return newPo;
  };

  // Stock Opname / Penyesuaian Fisik
  const recordStockAdjustment = (materialId: string, physicalCount: number, reason: string) => {
    setMaterials((prev) =>
      prev.map((mat) => {
        if (mat.id === materialId) {
          const diff = physicalCount - mat.stock;
          if (diff === 0) return mat;

          const movement: StockMovement = {
            id: `SM-${Date.now()}-${mat.id}`,
            date: new Date().toISOString(),
            materialId: mat.id,
            materialName: mat.name,
            type: diff > 0 ? 'ADJUSTMENT_PLUS' : 'ADJUSTMENT_MINUS',
            qtyChange: diff,
            unit: mat.baseUnit,
            previousStock: mat.stock,
            newStock: physicalCount,
            notes: `Stok Opname Fisik: ${reason} (Selisih ${diff > 0 ? '+' : ''}${diff} ${mat.baseUnit})`,
            operator: currentUser.name,
          };
          setStockMovements((prevMovements) => [movement, ...prevMovements]);
          return { ...mat, stock: physicalCount };
        }
        return mat;
      })
    );
  };

  // Reset to default
  const resetToDefaultData = () => {
    localStorage.clear();
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[2]);
    setSettings(INITIAL_SETTINGS);
    setMaterials(INITIAL_MATERIALS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setPurchases(INITIAL_PURCHASES);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        addUser,
        updateUser,
        deleteUser,
        settings,
        updateSettings,
        materials,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        customers,
        addCustomer,
        updateCustomer,
        recordCustomerDebtPayment,
        suppliers,
        addSupplier,
        updateSupplier,
        recordSupplierDebtPayment,
        transactions,
        recordTransaction,
        purchases,
        recordPurchase,
        stockMovements,
        recordStockAdjustment,
        isAuthenticated,
        login,
        logout,
        // Google Sheets
        googleUser,
        googleAccessToken,
        isGoogleConnected: Boolean(googleUser && googleAccessToken),
        loginWithGoogle,
        logoutGoogle,
        syncToGoogleSheets,
        pullFromGoogleSheetsData,
        createAndConnectSpreadsheet,
        connectExistingSpreadsheet,
        testGoogleWebhook,
        // Firebase
        syncToFirebaseDb,
        // MySQL Localhost
        mysqlConfig,
        updateMySqlConfig,
        testMySqlDb,
        initMySqlDbTables,
        syncToMySqlDb,
        pullFromMySqlDb,
        // Supabase
        isSupabaseActive: isSupabaseConfigured(settings.supabaseConfig),
        syncToSupabase,
        pullFromSupabaseData,
        playBeep,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
