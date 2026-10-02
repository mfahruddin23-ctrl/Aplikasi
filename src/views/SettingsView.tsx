import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StoreSettings, ThemeColor } from '../types';
import { THEME_OPTIONS, getTheme, applyThemeToDocument } from '../utils/theme';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
} from '../lib/supabase';
import {
  testSpreadsheetConnection,
  extractSpreadsheetId,
  APPS_SCRIPT_TEMPLATE_CODE,
  sendToAppsScriptWebhook,
  pingAppsScriptWebhook,
} from '../lib/googleSheets';
import {
  testFirebaseConnection,
} from '../lib/firebaseDatabase';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import {
  Settings,
  Store,
  Receipt,
  CreditCard,
  Shield,
  Save,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Palette,
  Database,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Code2,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  Building2,
  X,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Flame,
  Link2,
  Table,
  CheckCircle,
  FileCheck,
  Server,
  Download,
  Terminal,
  HelpCircle,
  HardDrive,
  Zap,
  CheckCheck,
} from 'lucide-react';
import {
  DEFAULT_MYSQL_CONFIG,
  generateMySqlSchemaSql,
  generateMySqlDataDumpSql,
  downloadSqlFile,
  generatePhpBridgeScript,
  MySqlTestResult,
} from '../lib/mysql';
import { MySqlConfigState } from '../types';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    users,
    currentUser,
    resetToDefaultData,
    syncToSupabase,
    pullFromSupabaseData,
    isSupabaseActive,
    googleUser,
    googleAccessToken,
    isGoogleConnected,
    loginWithGoogle,
    logoutGoogle,
    syncToGoogleSheets,
    pullFromGoogleSheetsData,
    createAndConnectSpreadsheet,
    connectExistingSpreadsheet,
    testGoogleWebhook,
    syncToFirebaseDb,
    mysqlConfig,
    updateMySqlConfig,
    testMySqlDb,
    initMySqlDbTables,
    syncToMySqlDb,
    pullFromMySqlDb,
    materials,
    customers,
    suppliers,
    transactions,
  } = useApp();

  const [formSettings, setFormSettings] = useState<StoreSettings>({
    ...settings,
    googleSheetsConfig: settings.googleSheetsConfig || {
      enabled: true,
      spreadsheetId: '',
      autoSync: true,
    },
    mysqlConfig: settings.mysqlConfig || DEFAULT_MYSQL_CONFIG,
    firebaseConfig: settings.firebaseConfig || {
      projectId: defaultFirebaseConfig.projectId,
      apiKey: defaultFirebaseConfig.apiKey,
      authDomain: defaultFirebaseConfig.authDomain,
      storageBucket: defaultFirebaseConfig.storageBucket,
      messagingSenderId: defaultFirebaseConfig.messagingSenderId,
      appId: defaultFirebaseConfig.appId,
    },
    supabaseConfig: settings.supabaseConfig || {
      supabaseUrl: ((import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL || '').trim(),
      supabaseAnonKey: ((import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_SUPABASE_ANON_KEY || '').trim(),
    },
  });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Spreadsheet Link input state
  const [spreadsheetLinkInput, setSpreadsheetLinkInput] = useState<string>(
    settings.googleSheetsConfig?.spreadsheetUrl ||
      (settings.googleSheetsConfig?.spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${settings.googleSheetsConfig.spreadsheetId}/edit`
        : '')
  );
  const [connectingLink, setConnectingLink] = useState<boolean>(false);

  // Database provider tab selection (MySQL Localhost is now first-class)
  const [activeDbTab, setActiveDbTab] = useState<'mysql' | 'sheets'>('mysql');

  // MySQL states
  const [mysqlForm, setMysqlForm] = useState<MySqlConfigState>(
    settings.mysqlConfig || DEFAULT_MYSQL_CONFIG
  );
  const [testingMysql, setTestingMysql] = useState<boolean>(false);
  const [mysqlTestResult, setMysqlTestResult] = useState<MySqlTestResult | null>(null);
  const [initMysqlLoading, setInitMysqlLoading] = useState<boolean>(false);
  const [mysqlSyncLoading, setMysqlSyncLoading] = useState<boolean>(false);
  const [mysqlPullLoading, setMysqlPullLoading] = useState<boolean>(false);
  const [mysqlStatusMsg, setMysqlStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState<boolean>(false);
  const [showXamppGuide, setShowXamppGuide] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedPhpBridge, setCopiedPhpBridge] = useState<boolean>(false);

  // Google Sheets states
  const [sheetsMode, setSheetsMode] = useState<'simple' | 'oauth'>(
    settings.googleSheetsConfig?.connectionMode || 'simple'
  );
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(
    settings.googleSheetsConfig?.webhookUrl || ''
  );
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [showSimpleGuide, setShowSimpleGuide] = useState<boolean>(true);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState<boolean>(false);
  const [creatingSheet, setCreatingSheet] = useState<boolean>(false);
  const [testingSheets, setTestingSheets] = useState<boolean>(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{
    success: boolean;
    message: string;
    title?: string;
  } | null>(null);
  const [sheetsSyncLoading, setSheetsSyncLoading] = useState<boolean>(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState<boolean>(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState<boolean>(false);

  // Firebase states
  const [testingFirebase, setTestingFirebase] = useState<boolean>(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [firebaseSyncLoading, setFirebaseSyncLoading] = useState<boolean>(false);
  const [firebaseSyncMsg, setFirebaseSyncMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Supabase states
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState<boolean>(false);

  const currentTheme = getTheme(formSettings.themeColor);

  // Live Theme Selection Handler
  const handleThemeSelect = (themeId: ThemeColor) => {
    setFormSettings((prev) => ({ ...prev, themeColor: themeId }));
    applyThemeToDocument(themeId);
  };

  // Bank Accounts management state
  const handleAddBank = () => {
    setFormSettings((prev) => ({
      ...prev,
      bankAccounts: [
        ...prev.bankAccounts,
        { bank: 'BCA', accountNo: '', accountHolder: prev.storeName },
      ],
    }));
  };

  const handleUpdateBank = (
    index: number,
    field: 'bank' | 'accountNo' | 'accountHolder',
    value: string
  ) => {
    setFormSettings((prev) => {
      const updated = [...prev.bankAccounts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, bankAccounts: updated };
    });
  };

  const handleRemoveBank = (index: number) => {
    setFormSettings((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((_, i) => i !== index),
    }));
  };

  // Logo upload handlers (FileReader to Base64 data URL)
  const handleUploadAppLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file logo aplikasi maksimal 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFormSettings((prev) => ({
          ...prev,
          appLogoUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCompanyLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file logo perusahaan maksimal 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFormSettings((prev) => ({
          ...prev,
          companyLogoUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Test Supabase Connection
  const handleTestSupabase = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(formSettings.supabaseConfig);
      setTestResult(res);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        message: `Koneksi gagal: ${errorMsg}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Sync Local data to Supabase
  const handleSyncToCloud = async () => {
    setSyncLoading(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncToSupabase(formSettings.supabaseConfig);
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: 'Berhasil mengunggah dan menyinkronkan data toko ke Supabase Cloud!',
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: `Gagal sinkronisasi: ${res.error || res.message}`,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSyncStatusMsg({
        type: 'error',
        text: `Terjadi kendala: ${errorMsg}`,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Pull data from Supabase
  const handlePullFromCloud = async () => {
    setSyncLoading(true);
    setSyncStatusMsg(null);
    try {
      const res = await pullFromSupabaseData(formSettings.supabaseConfig);
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: 'Berhasil menarik data material & transaksi terbaru dari Supabase!',
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: `Gagal menarik data: ${res.error || res.message}`,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSyncStatusMsg({
        type: 'error',
        text: `Terjadi kendala: ${errorMsg}`,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Google Sheets Handlers
  // Simple Mode Handler (Zero-Popup Setup via Webhook & Spreadsheet Link)
  const handleConnectSimpleMode = async () => {
    const trimmedLink = spreadsheetLinkInput.trim();
    const trimmedWebhook = webhookUrlInput.trim();

    if (!trimmedLink && !trimmedWebhook) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Silakan masukkan Link Google Spreadsheet atau URL Web App Google Apps Script.',
      });
      return;
    }

    setConnectingLink(true);
    setSheetsSyncMsg(null);
    setSheetsTestResult(null);

    try {
      const cleanId = trimmedLink ? extractSpreadsheetId(trimmedLink) : formSettings.googleSheetsConfig?.spreadsheetId || '';
      const fullUrl = cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : trimmedLink;

      if (trimmedWebhook) {
        setSheetsSyncMsg({
          type: 'info',
          text: 'Menguji koneksi ke Google Apps Script Webhook...',
        });

        const pingRes = await testGoogleWebhook(trimmedWebhook);
        if (!pingRes.success) {
          setSheetsSyncMsg({
            type: 'error',
            text: `Koneksi Webhook gagal: ${pingRes.message}. Pastikan Web App sudah di-deploy dengan akses "Anyone" (Siapa saja).`,
          });
          setConnectingLink(false);
          return;
        }

        const updatedConfig = {
          enabled: true,
          spreadsheetId: cleanId,
          spreadsheetUrl: fullUrl,
          webhookUrl: trimmedWebhook,
          connectionMode: 'simple' as const,
          autoSync: true,
          lastSync: new Date().toLocaleString('id-ID'),
        };

        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: {
            ...(prev.googleSheetsConfig || {}),
            ...updatedConfig,
          },
        }));

        updateSettings({
          googleSheetsConfig: {
            ...(formSettings.googleSheetsConfig || {}),
            ...updatedConfig,
          },
        });

        // Trigger initial data sync
        await sendToAppsScriptWebhook(trimmedWebhook, 'sync_all', {
          materials,
          customers,
          suppliers,
          transactions,
          settings: formSettings,
        });

        setSheetsSyncMsg({
          type: 'success',
          text: `✅ Google Spreadsheet berhasil terhubung dengan Konfigurasi Simple! Data toko telah disinkronkan dan auto-sync realtime aktif.`,
        });

        setSheetsTestResult({
          success: true,
          message: pingRes.message || 'Webhook Google Spreadsheet Aktif & Terhubung',
        });
      } else {
        if (!cleanId || cleanId.length < 15) {
          setSheetsSyncMsg({
            type: 'error',
            text: 'Format link Google Spreadsheet tidak valid. Pastikan link lengkap (contoh: https://docs.google.com/spreadsheets/d/.../edit).',
          });
          setConnectingLink(false);
          return;
        }

        const updatedConfig = {
          enabled: true,
          spreadsheetId: cleanId,
          spreadsheetUrl: fullUrl,
          connectionMode: 'simple' as const,
          autoSync: true,
          lastSync: new Date().toLocaleString('id-ID'),
        };

        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: {
            ...(prev.googleSheetsConfig || {}),
            ...updatedConfig,
          },
        }));

        updateSettings({
          googleSheetsConfig: {
            ...(formSettings.googleSheetsConfig || {}),
            ...updatedConfig,
          },
        });

        setSheetsSyncMsg({
          type: 'success',
          text: `ID Spreadsheet tersimpan (${cleanId}). Untuk mengaktifkan auto-sync transaksi tanpa login popup, tempelkan juga URL Web App Google Apps Script di kolom bawahnya!`,
        });

        setSheetsTestResult({
          success: true,
          message: `ID Spreadsheet tersimpan: ${cleanId}`,
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Kendala menghubungkan spreadsheet: ' + (err.message || String(err)),
      });
    } finally {
      setConnectingLink(false);
    }
  };

  const handleTestSimpleWebhook = async () => {
    const url = webhookUrlInput.trim() || formSettings.googleSheetsConfig?.webhookUrl;
    if (!url) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Masukkan URL Web App Google Apps Script terlebih dahulu.',
      });
      return;
    }

    setTestingWebhook(true);
    setSheetsTestResult(null);
    try {
      const res = await testGoogleWebhook(url);
      setSheetsTestResult({
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        setSheetsSyncMsg({
          type: 'success',
          text: 'Koneksi ke Google Spreadsheet Webhook Berhasil & Aktif!',
        });
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setSheetsTestResult({
        success: false,
        message: 'Koneksi gagal: ' + (err.message || String(err)),
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleConnectSpreadsheetLink = async () => {
    const trimmedInput = spreadsheetLinkInput.trim();
    if (!trimmedInput) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Silakan masukkan atau tempelkan link/URL Google Spreadsheet terlebih dahulu.',
      });
      return;
    }

    setConnectingLink(true);
    setSheetsTestResult(null);
    setSheetsSyncMsg(null);

    try {
      // 1. Ensure user is authenticated to Google to have API write permissions
      let activeToken = googleAccessToken;
      if (!activeToken) {
        setSheetsSyncMsg({
          type: 'info',
          text: 'Membuka jendela otentikasi Google untuk mengizinkan aplikasi menyiapkan lembar kerja spreadsheet...',
        });
        const loginRes = await loginWithGoogle();
        if (loginRes.cancelled) {
          setSheetsSyncMsg({
            type: 'info',
            text: 'Jendela login Google ditutup. Silakan klik tombol "Hubungkan Spreadsheet Kosong" kembali saat siap.',
          });
          setConnectingLink(false);
          return;
        }
        if (!loginRes.success || !loginRes.token) {
          setSheetsSyncMsg({
            type: 'error',
            text: loginRes.error || 'Otentikasi Google gagal. Izin akses diperlukan agar data POS dapat disimpan ke Google Sheets.',
          });
          setConnectingLink(false);
          return;
        }
        activeToken = loginRes.token;
      }

      setSheetsSyncMsg({
        type: 'info',
        text: 'Memeriksa lembar kerja dan menyiapkan 7 tabel database pada spreadsheet kosong Anda...',
      });

      // 2. Connect to the empty spreadsheet and initialize 7 sheets + sync existing store data
      let res = await connectExistingSpreadsheet(trimmedInput, activeToken);

      // If token was expired or requires login, retry once after prompt
      if (!res.success && res.requiresGoogleLogin) {
        const retryLogin = await loginWithGoogle();
        if (retryLogin.success && retryLogin.token) {
          activeToken = retryLogin.token;
          res = await connectExistingSpreadsheet(trimmedInput, activeToken);
        }
      }

      if (res.success && res.spreadsheetId) {
        const fullUrl = res.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/edit`;
        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: {
            enabled: true,
            spreadsheetId: res.spreadsheetId!,
            spreadsheetUrl: fullUrl,
            spreadsheetName: res.spreadsheetTitle || `Database POS - ${res.spreadsheetId}`,
            autoSync: true,
            lastSync: new Date().toLocaleString('id-ID'),
            webhookUrl: prev.googleSheetsConfig?.webhookUrl,
          },
        }));

        setSpreadsheetLinkInput(fullUrl);

        setSheetsSyncMsg({
          type: 'success',
          text: `✅ Berhasil terhubung ke spreadsheet "${res.spreadsheetTitle || res.spreadsheetId}"! Struktur 7 lembar kerja database (Produk, Transaksi, Item_Transaksi, Pelanggan, Pemasok, Pembelian, Pengaturan) telah siap dan seluruh data toko Anda telah disinkronkan.`,
        });

        setSheetsTestResult({
          success: true,
          message: `Terhubung ke: ${res.spreadsheetTitle || res.spreadsheetId}`,
          title: res.spreadsheetTitle,
        });
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: res.message || 'Gagal menghubungkan spreadsheet.',
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: `Terjadi kendala saat menghubungkan spreadsheet: ${err.message || String(err)}`,
      });
    } finally {
      setConnectingLink(false);
    }
  };
  const handleGoogleSignIn = async () => {
    setIsLoggingInGoogle(true);
    setSheetsTestResult(null);
    setSheetsSyncMsg(null);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        setSheetsSyncMsg({
          type: 'success',
          text: 'Berhasil login ke Google! Akun Google Anda kini siap mengakses dan menyinkronkan Google Sheets.',
        });
      } else if (res.cancelled) {
        setSheetsSyncMsg({
          type: 'info',
          text: 'Jendela login Google ditutup. Anda dapat mencoba login kembali kapan saja.',
        });
      } else if (res.error) {
        setSheetsSyncMsg({
          type: 'error',
          text: res.error,
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: `Gagal login ke Google: ${err.message || String(err)}`,
      });
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setSheetsSyncMsg({
      type: 'info',
      text: 'Akun Google berhasil logout.',
    });
  };

  const handleCreateDatabaseSpreadsheet = async () => {
    setCreatingSheet(true);
    setSheetsTestResult(null);
    setSheetsSyncMsg(null);
    try {
      const res = await createAndConnectSpreadsheet(formSettings.storeName);
      if (res.success && res.spreadsheetId) {
        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: {
            enabled: true,
            spreadsheetId: res.spreadsheetId!,
            spreadsheetUrl: res.spreadsheetUrl,
            spreadsheetName: `Database POS - ${prev.storeName}`,
            autoSync: true,
            lastSync: new Date().toLocaleString('id-ID'),
            webhookUrl: prev.googleSheetsConfig?.webhookUrl,
          },
        }));
        setSheetsSyncMsg({
          type: 'success',
          text: `Spreadsheet database baru berhasil dibuat di Google Drive Anda! ID: ${res.spreadsheetId}`,
        });
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: `Gagal membuat spreadsheet: ${err.message || String(err)}`,
      });
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleTestGoogleSheets = async () => {
    const rawId = formSettings.googleSheetsConfig?.spreadsheetId;
    if (!rawId) {
      setSheetsTestResult({
        success: false,
        message: 'Masukkan ID atau URL Google Spreadsheet terlebih dahulu.',
      });
      return;
    }

    setTestingSheets(true);
    setSheetsTestResult(null);
    try {
      const res = await testSpreadsheetConnection(rawId, googleAccessToken);
      setSheetsTestResult({
        success: res.success,
        message: res.message,
        title: res.spreadsheetTitle,
      });
    } catch (err: any) {
      setSheetsTestResult({
        success: false,
        message: `Koneksi gagal: ${err.message || String(err)}`,
      });
    } finally {
      setTestingSheets(false);
    }
  };

  const handleSyncToSheets = async () => {
    const rawId = formSettings.googleSheetsConfig?.spreadsheetId;
    if (!rawId) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'ID Spreadsheet belum diisi. Buat baru atau masukkan ID Spreadsheet.',
      });
      return;
    }

    setSheetsSyncLoading(true);
    setSheetsSyncMsg(null);
    try {
      const res = await syncToGoogleSheets(rawId);
      if (res.success) {
        setSheetsSyncMsg({
          type: 'success',
          text: `Semua data produk, transaksi, pelanggan, supplier, dan faktur berhasil disinkronkan ke Google Spreadsheet! (${res.details?.materialsCount || 0} barang, ${res.details?.transactionsCount || 0} transaksi).`,
        });
        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: {
            ...(prev.googleSheetsConfig || { enabled: true, autoSync: true, spreadsheetId: rawId }),
            lastSync: new Date().toLocaleString('id-ID'),
          },
        }));
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: `Terjadi kendala saat sinkronisasi: ${err.message || String(err)}`,
      });
    } finally {
      setSheetsSyncLoading(false);
    }
  };

  const handlePullFromSheets = async () => {
    const rawId = formSettings.googleSheetsConfig?.spreadsheetId;
    if (!rawId) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'ID Spreadsheet belum diisi.',
      });
      return;
    }

    setSheetsSyncLoading(true);
    setSheetsSyncMsg(null);
    try {
      const res = await pullFromGoogleSheetsData(rawId);
      if (res.success) {
        setSheetsSyncMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: `Gagal menarik data: ${err.message || String(err)}`,
      });
    } finally {
      setSheetsSyncLoading(false);
    }
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE_CODE);
    setCopiedAppsScript(true);
    setTimeout(() => setCopiedAppsScript(false), 2500);
  };

  // MySQL Localhost Handlers
  const handleTestMySql = async () => {
    setTestingMysql(true);
    setMysqlTestResult(null);
    setMysqlStatusMsg(null);
    try {
      const res = await testMySqlDb(mysqlForm);
      setMysqlTestResult(res);
      if (res.success) {
        setMysqlStatusMsg({
          type: 'success',
          text: res.message,
        });
        setMysqlForm((prev) => ({ ...prev, status: 'connected' }));
      } else {
        setMysqlStatusMsg({
          type: 'error',
          text: res.message,
        });
        setMysqlForm((prev) => ({ ...prev, status: 'error' }));
      }
    } catch (err: any) {
      setMysqlStatusMsg({
        type: 'error',
        text: 'Gagal menghubungi server MySQL backend: ' + (err.message || String(err)),
      });
    } finally {
      setTestingMysql(false);
    }
  };

  const handleInitMySql = async () => {
    setInitMysqlLoading(true);
    setMysqlStatusMsg(null);
    try {
      const res = await initMySqlDbTables(mysqlForm);
      if (res.success) {
        setMysqlStatusMsg({
          type: 'success',
          text: res.message + (res.tables ? ` (${res.tables.length} tabel siap digunakan)` : ''),
        });
        // Re-test connection to refresh status
        await testMySqlDb(mysqlForm);
      } else {
        setMysqlStatusMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setMysqlStatusMsg({
        type: 'error',
        text: 'Gagal inisialisasi tabel: ' + (err.message || String(err)),
      });
    } finally {
      setInitMysqlLoading(false);
    }
  };

  const handleSyncToMySql = async () => {
    setMysqlSyncLoading(true);
    setMysqlStatusMsg(null);
    try {
      const res = await syncToMySqlDb(mysqlForm);
      if (res.success) {
        setMysqlStatusMsg({
          type: 'success',
          text: res.message,
        });
        setMysqlForm((prev) => ({
          ...prev,
          lastSync: new Date().toLocaleString('id-ID'),
          status: 'connected',
        }));
      } else {
        setMysqlStatusMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setMysqlStatusMsg({
        type: 'error',
        text: 'Gagal sinkronisasi ke MySQL: ' + (err.message || String(err)),
      });
    } finally {
      setMysqlSyncLoading(false);
    }
  };

  const handlePullFromMySql = async () => {
    setMysqlPullLoading(true);
    setMysqlStatusMsg(null);
    try {
      const res = await pullFromMySqlDb(mysqlForm);
      if (res.success) {
        setMysqlStatusMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setMysqlStatusMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setMysqlStatusMsg({
        type: 'error',
        text: 'Gagal mengambil data dari MySQL: ' + (err.message || String(err)),
      });
    } finally {
      setMysqlPullLoading(false);
    }
  };

  const handleDownloadSchema = () => {
    const sql = generateMySqlSchemaSql(mysqlForm.database || 'kasir_db');
    downloadSqlFile(`schema_${mysqlForm.database || 'kasir_db'}.sql`, sql);
  };

  const handleDownloadDump = () => {
    const sql = generateMySqlDataDumpSql(
      {
        materials,
        customers,
        suppliers,
        transactions,
        settings: formSettings,
      },
      mysqlForm.database || 'kasir_db'
    );
    downloadSqlFile(`backup_${mysqlForm.database || 'kasir_db'}_dump.sql`, sql);
  };

  const handleDownloadBridge = () => {
    const php = generatePhpBridgeScript(mysqlForm);
    const blob = new Blob([php], { type: 'application/x-httpd-php;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pos_bridge.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySchemaSql = () => {
    const sql = generateMySqlSchemaSql(mysqlForm.database || 'kasir_db');
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyPhpBridge = () => {
    const php = generatePhpBridgeScript(mysqlForm);
    navigator.clipboard.writeText(php);
    setCopiedPhpBridge(true);
    setTimeout(() => setCopiedPhpBridge(false), 2500);
  };

  // Firebase Handlers
  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    setFirebaseTestResult(null);
    try {
      const res = await testFirebaseConnection(formSettings.firebaseConfig);
      setFirebaseTestResult(res);
    } catch (err: any) {
      setFirebaseTestResult({
        success: false,
        message: `Koneksi Firebase gagal: ${err.message || String(err)}`,
      });
    } finally {
      setTestingFirebase(false);
    }
  };

  const handleSyncToFirebase = async () => {
    setFirebaseSyncLoading(true);
    setFirebaseSyncMsg(null);
    try {
      const res = await syncToFirebaseDb();
      if (res.success) {
        setFirebaseSyncMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setFirebaseSyncMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFirebaseSyncMsg({
        type: 'error',
        text: `Kendala Firebase: ${err.message || String(err)}`,
      });
    } finally {
      setFirebaseSyncLoading(false);
    }
  };

  // Copy SQL Script
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Submit Settings Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...formSettings,
      mysqlConfig: mysqlForm,
    });
    applyThemeToDocument(formSettings.themeColor);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Reset demo data handler
  const handleResetData = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mereset seluruh data ke data sampel bawaan pabrik? Semua transaksi baru yang belum disimpan akan terhapus.'
      )
    ) {
      resetToDefaultData();
      alert('Data sistem POS Toko Material berhasil direset ke pengaturan awal!');
    }
  };

  return (
    <div id="settings-view-page" className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6" style={{ color: currentTheme.primaryHex }} />
            Pengaturan Toko, Tema & Database Cloud
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur tema warna antarmuka, sinkronisasi Supabase Cloud, format cetak struk nota, tarif pajak PPN, dan rekening pembayaran.
          </p>
        </div>

        {saveSuccess && (
          <div
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold animate-fade-in shadow-xs"
            style={{
              backgroundColor: currentTheme.lightHex,
              color: currentTheme.primaryHex,
            }}
          >
            <Check className="w-4 h-4" />
            <span>Pengaturan berhasil disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: THEME COLOR SETTINGS (PENGATURAN TEMA WARNA APLIKASI) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5" style={{ color: currentTheme.primaryHex }} />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Pengaturan Tema Warna Aplikasi
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pilih nuansa warna yang sesuai dengan identitas toko bangunan dan kenyamanan mata Anda
                </p>
              </div>
            </div>

            {/* Live Indicator */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: currentTheme.lightHex,
                borderColor: currentTheme.primaryHex,
                color: currentTheme.primaryHex,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentTheme.primaryHex }}
              />
              <span>Tema Aktif: {currentTheme.name}</span>
            </div>
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {THEME_OPTIONS.map((t) => {
              const isSelected = formSettings.themeColor === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleThemeSelect(t.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'shadow-md ring-2 ring-offset-1'
                      : 'hover:border-slate-300 hover:bg-slate-50/70 border-slate-200'
                  }`}
                  style={{
                    borderColor: isSelected ? t.primaryHex : undefined,
                    boxShadow: isSelected ? `0 4px 14px ${t.primaryHex}25` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      {/* Swatch Circle */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-xs"
                        style={{ backgroundColor: t.primaryHex }}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : null}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{t.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {t.primaryHex}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: t.lightHex,
                          color: t.primaryHex,
                        }}
                      >
                        Dipilih
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 mb-2">
                    {t.description}
                  </p>

                  {/* Visual Palette Preview */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <div
                      className="h-3.5 flex-1 rounded-sm shadow-2xs"
                      style={{ backgroundColor: t.primaryHex }}
                      title="Warna Primer"
                    />
                    <div
                      className="h-3.5 flex-1 rounded-sm shadow-2xs"
                      style={{ backgroundColor: t.hoverHex }}
                      title="Warna Hover / Aksen"
                    />
                    <div
                      className="h-3.5 flex-1 rounded-sm border border-slate-200"
                      style={{ backgroundColor: t.lightHex }}
                      title="Warna Background Lembut"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: INTEGRASI DATABASE (MYSQL LOCALHOST & GOOGLE SPREADSHEET) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          {/* Header & Database Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Integrasi Database Toko
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    MySQL Localhost &amp; Google Sheets
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Gunakan MySQL Server Localhost (XAMPP / Laragon) untuk kecepatan transaksi lokal, atau Google Spreadsheet untuk cloud
                </p>
              </div>
            </div>

            {/* Provider Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveDbTab('mysql')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDbTab === 'mysql'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>MySQL Localhost</span>
                {mysqlForm.enabled && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveDbTab('sheets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDbTab === 'sheets'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Google Spreadsheet</span>
                {isGoogleConnected && formSettings.googleSheetsConfig?.spreadsheetId && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            </div>
          </div>

          {/* TAB 1: MYSQL LOCALHOST */}
          {activeDbTab === 'mysql' && (
            <div className="space-y-5">
              {/* Feature Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">
                      Database MySQL Server Localhost (XAMPP / Laragon / WampServer)
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Menyimpan data stok barang, transaksi penjualan kasir, pelanggan, dan supplier secara langsung ke database MySQL di komputer lokal Anda (port 3306). Sangat cepat, handal untuk volume transaksi tinggi, dan dapat diakses melalui phpMyAdmin.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      mysqlForm.status === 'connected'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : mysqlForm.status === 'error'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        mysqlForm.status === 'connected'
                          ? 'bg-emerald-500 animate-pulse'
                          : mysqlForm.status === 'error'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    {mysqlForm.status === 'connected'
                      ? 'MySQL Terhubung'
                      : mysqlForm.status === 'error'
                      ? 'Koneksi Terputus'
                      : 'Belum Dites'}
                  </span>
                </div>
              </div>

              {/* Status Message Alert */}
              {mysqlStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                    mysqlStatusMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : mysqlStatusMsg.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  {mysqlStatusMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : mysqlStatusMsg.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div className="flex-1">
                    <p>{mysqlStatusMsg.text}</p>
                    {mysqlTestResult?.version && (
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        Versi Server: {mysqlTestResult.version} | Database: {mysqlTestResult.database}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMysqlStatusMsg(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* MySQL Form Configuration */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Parameter Koneksi MySQL Localhost
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Default XAMPP: root / tanpa password
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Host */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Host Server:
                    </label>
                    <input
                      type="text"
                      value={mysqlForm.host}
                      onChange={(e) =>
                        setMysqlForm((prev) => ({ ...prev, host: e.target.value }))
                      }
                      placeholder="localhost atau 127.0.0.1"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      Gunakan <code>localhost</code> atau <code>127.0.0.1</code>
                    </span>
                  </div>

                  {/* Port */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Port MySQL:
                    </label>
                    <input
                      type="number"
                      value={mysqlForm.port}
                      onChange={(e) =>
                        setMysqlForm((prev) => ({ ...prev, port: Number(e.target.value) || 3306 }))
                      }
                      placeholder="3306"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      Port standar MySQL adalah 3306
                    </span>
                  </div>

                  {/* Database Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Nama Database:
                    </label>
                    <input
                      type="text"
                      value={mysqlForm.database}
                      onChange={(e) =>
                        setMysqlForm((prev) => ({ ...prev, database: e.target.value }))
                      }
                      placeholder="kasir_db"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      Contoh: <code>kasir_db</code> atau <code>toko_material_db</code>
                    </span>
                  </div>

                  {/* Username */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Username MySQL:
                    </label>
                    <input
                      type="text"
                      value={mysqlForm.user}
                      onChange={(e) =>
                        setMysqlForm((prev) => ({ ...prev, user: e.target.value }))
                      }
                      placeholder="root"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      Standar user lokal XAMPP / Laragon: <code>root</code>
                    </span>
                  </div>

                  {/* Password */}
                  <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Password MySQL (Kosongkan jika tanpa password):
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={mysqlForm.password || ''}
                        onChange={(e) =>
                          setMysqlForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="Default XAMPP biasanya kosong"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mysqlForm.enabled}
                      onChange={(e) =>
                        setMysqlForm((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Aktifkan Database MySQL Localhost
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Jadikan MySQL sebagai target penyimpanan data transaksi toko
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mysqlForm.autoSync !== false}
                      onChange={(e) =>
                        setMysqlForm((prev) => ({ ...prev, autoSync: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Auto-Sync Setiap Transaksi Baru
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Setiap kasir selesai cetak nota, otomatis disimpan ke MySQL
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Tes Koneksi */}
                <button
                  type="button"
                  onClick={handleTestMySql}
                  disabled={testingMysql}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${testingMysql ? 'animate-spin' : ''}`} />
                  <span>{testingMysql ? 'Menguji Koneksi...' : '1. Tes Koneksi MySQL'}</span>
                </button>

                {/* 2. Inisialisasi Tabel Otomatis */}
                <button
                  type="button"
                  onClick={handleInitMySql}
                  disabled={initMysqlLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                  title="Membuat database kasir_db dan 9 tabel kasir secara otomatis"
                >
                  <Table className={`w-4 h-4 ${initMysqlLoading ? 'animate-spin' : ''}`} />
                  <span>{initMysqlLoading ? 'Membuat Tabel...' : '2. Inisialisasi Tabel Otomatis'}</span>
                </button>

                {/* 3. Sinkronkan Data ke MySQL */}
                <button
                  type="button"
                  onClick={handleSyncToMySql}
                  disabled={mysqlSyncLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                  title="Kirim semua data barang, transaksi & pelanggan ke MySQL"
                >
                  <CloudUpload className={`w-4 h-4 ${mysqlSyncLoading ? 'animate-spin' : ''}`} />
                  <span>{mysqlSyncLoading ? 'Menyinkronkan...' : '3. Simpan / Sinkron ke MySQL'}</span>
                </button>

                {/* 4. Tarik Data dari MySQL */}
                <button
                  type="button"
                  onClick={handlePullFromMySql}
                  disabled={mysqlPullLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                  title="Ambil data barang dan transaksi dari MySQL ke aplikasi POS"
                >
                  <CloudDownload className={`w-4 h-4 ${mysqlPullLoading ? 'animate-spin' : ''}`} />
                  <span>{mysqlPullLoading ? 'Mengambil...' : '4. Tarik Data dari MySQL'}</span>
                </button>
              </div>

              {/* Extra Utilities (SQL Schema, Backup Dump, XAMPP Guide) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Alat Pendukung MySQL &amp; Panduan XAMPP / Laragon
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowXamppGuide(!showXamppGuide)}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showXamppGuide ? 'Tutup Panduan' : 'Panduan XAMPP'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSqlSchemaModal(!showSqlSchemaModal)}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{showSqlSchemaModal ? 'Tutup Kode SQL' : 'Lihat Skema SQL'}</span>
                    </button>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadSchema}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                    title="Download file .sql skema database untuk diimpor ke phpMyAdmin"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download Skema SQL (.sql)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDump}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                    title="Download backup lengkap data produk dan transaksi dalam format SQL"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Backup Data (.sql)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadBridge}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                    title="Download script PHP bridge untuk ditaruh di folder htdocs XAMPP"
                  >
                    <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download Script Bridge PHP (XAMPP)</span>
                  </button>
                </div>

                {/* Step-by-Step XAMPP Guide */}
                {showXamppGuide && (
                  <div className="mt-3 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2 text-slate-700">
                    <h5 className="font-bold text-blue-900 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      Langkah Menjalankan MySQL di Komputer (XAMPP / Laragon):
                    </h5>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] leading-relaxed">
                      <li>
                        <strong>Buka XAMPP Control Panel</strong> atau <strong>Laragon</strong> pada komputer Anda.
                      </li>
                      <li>
                        Klik tombol <strong>Start</strong> pada modul <strong>MySQL</strong> (dan Apache). Pastikan status berwarna hijau / port 3306 aktif.
                      </li>
                      <li>
                        Buka browser dan akses <code>http://localhost/phpmyadmin</code> untuk melihat database Anda.
                      </li>
                      <li>
                        Pada formulir di atas, klik tombol <strong>"2. Inisialisasi Tabel Otomatis"</strong> atau impor file <code>schema_kasir_db.sql</code> melalui menu <em>Import</em> di phpMyAdmin.
                      </li>
                      <li>
                        Klik <strong>"1. Tes Koneksi MySQL"</strong> &rarr; Setelah muncul status <em>MySQL Terhubung</em>, aktifkan toggle <em>"Aktifkan Database MySQL Localhost"</em> dan simpan pengaturan!
                      </li>
                    </ol>
                  </div>
                )}

                {/* SQL Schema Preview */}
                {showSqlSchemaModal && (
                  <div className="mt-3 p-4 bg-slate-900 rounded-xl text-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Skema DDL MySQL ({mysqlForm.database || 'kasir_db'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopySchemaSql}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                        >
                          {copiedSql ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin SQL</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Anda dapat menyalin query di bawah ini dan menjalankannya langsung di tab <strong>SQL</strong> pada <strong>phpMyAdmin</strong> atau HeidiSQL:
                    </p>

                    <pre className="max-h-56 overflow-y-auto text-[10px] font-mono p-3 bg-slate-950 rounded-lg text-blue-300 select-all leading-relaxed">
                      {generateMySqlSchemaSql(mysqlForm.database || 'kasir_db')}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SPREADSHEET */}
          {activeDbTab === 'sheets' && (
            <div className="space-y-4">
              {/* Feature Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">
                      Database Berbasis Google Spreadsheet (Google Drive)
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Setiap data barang, pelanggan, supplier, dan transaksi penjualan kasir otomatis tercatat rapi dalam lembar kerja Google Sheets. Anda dapat memantau dan membuka pembukuan toko kapan saja lewat HP atau PC!
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isGoogleConnected && formSettings.googleSheetsConfig?.spreadsheetId
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isGoogleConnected
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isGoogleConnected && formSettings.googleSheetsConfig?.spreadsheetId
                          ? 'bg-emerald-500 animate-pulse'
                          : isGoogleConnected
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    {isGoogleConnected && formSettings.googleSheetsConfig?.spreadsheetId
                      ? 'Spreadsheet Terhubung & Aktif'
                      : isGoogleConnected
                      ? 'Google Terhubung (Belum Pilih Sheet)'
                      : 'Belum Terhubung'}
                  </span>
                </div>
              </div>

              {/* Step 1: Google Account Authentication */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Otentikasi Akun Google Anda
                    </span>
                  </div>

                  {googleUser && (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Login Berhasil
                    </span>
                  )}
                </div>

                {googleUser ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      {googleUser.photoURL ? (
                        <img
                          src={googleUser.photoURL}
                          alt={googleUser.displayName || 'Google User'}
                          className="w-9 h-9 rounded-full border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                          {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {googleUser.displayName || 'Akun Google Terhubung'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {googleUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    >
                      Ganti Akun / Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Masuk dengan akun Google Anda untuk memberi izin pembuatan dan pembaruan Spreadsheet.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Izin yang digunakan: Google Sheets (membaca & menulis data tabel) dan Google Drive (file terpilih).
                      </p>
                    </div>

                    {/* Official Google Sign-In Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoggingInGoogle}
                      className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="w-4 h-4 shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                      <span>
                        {isLoggingInGoogle ? 'Menghubungkan...' : 'Sign in with Google'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Spreadsheet File Setup */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Hubungkan dengan Link Spreadsheet Kosong
                  </span>
                </div>

                {/* Method 1: Hubungkan dengan Link Spreadsheet Kosong (Utama) */}
                <div className="p-4 bg-white rounded-xl border-2 border-emerald-400 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold text-slate-900">
                        Tempelkan Link Google Spreadsheet Kosong Anda
                      </h5>
                    </div>

                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buat Spreadsheet Kosong Baru (sheets.new) ↗</span>
                    </a>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-1 leading-relaxed">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Panduan menghubungkan spreadsheet kosong:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
                      <li>Buka Google Spreadsheet atau klik tombol <strong>"Buat Spreadsheet Kosong Baru"</strong> di atas.</li>
                      <li>Biarkan lembar kerja tersebut dalam keadaan <strong>kosong (blank)</strong>.</li>
                      <li>Salin link lengkap dari browser (contoh: <em>https://docs.google.com/spreadsheets/d/.../edit</em>).</li>
                      <li>Tempelkan di kolom berikut lalu klik tombol hijau <strong>"Hubungkan Spreadsheet Kosong"</strong>.</li>
                    </ol>
                    <p className="text-[10px] text-emerald-800 font-semibold pt-1 border-t border-emerald-200/80">
                      Sistem akan otomatis mendeteksi sheet kosong, membuat 7 lembar kerja database (Produk, Transaksi, Item_Transaksi, Pelanggan, Pemasok, Pembelian, Pengaturan), dan menyinkronkan seluruh data toko Anda.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={spreadsheetLinkInput}
                        onChange={(e) => setSpreadsheetLinkInput(e.target.value)}
                        placeholder="Contoh: https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-8"
                      />
                      {spreadsheetLinkInput && (
                        <button
                          type="button"
                          onClick={() => setSpreadsheetLinkInput('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title="Hapus input"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={connectingLink || !spreadsheetLinkInput.trim()}
                      onClick={handleConnectSpreadsheetLink}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      <Link2 className={`w-3.5 h-3.5 ${connectingLink ? 'animate-spin' : ''}`} />
                      <span>{connectingLink ? 'Menyiapkan 7 Sheet...' : 'Hubungkan Spreadsheet Kosong'}</span>
                    </button>
                  </div>

                  {formSettings.googleSheetsConfig?.spreadsheetId && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-950 block truncate">
                            {formSettings.googleSheetsConfig.spreadsheetName || 'Spreadsheet Terhubung'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-700">
                            (ID: {formSettings.googleSheetsConfig.spreadsheetId})
                          </span>
                        </div>
                      </div>

                      <a
                        href={
                          formSettings.googleSheetsConfig.spreadsheetUrl ||
                          `https://docs.google.com/spreadsheets/d/${formSettings.googleSheetsConfig.spreadsheetId}/edit`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Lembar Kerja di Google Drive ↗</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Method 2: Buat Otomatis 1-Klik */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Belum punya file Spreadsheet?</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Buat file Google Spreadsheet baru di Google Drive Anda secara otomatis (lengkap dengan 7 sheet).
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={creatingSheet || !isGoogleConnected}
                    onClick={handleCreateDatabaseSpreadsheet}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 shrink-0"
                  >
                    <Plus className={`w-3.5 h-3.5 ${creatingSheet ? 'animate-spin' : ''}`} />
                    <span>{creatingSheet ? 'Sedang Membuat...' : 'Buat Otomatis (1-Klik)'}</span>
                  </button>
                </div>

                {/* Realtime Auto-Sync Checkbox */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="auto-sync-sheets"
                    checked={formSettings.googleSheetsConfig?.autoSync !== false}
                    onChange={(e) => {
                      setFormSettings((prev) => ({
                        ...prev,
                        googleSheetsConfig: {
                          ...(prev.googleSheetsConfig || { enabled: true, spreadsheetId: '' }),
                          autoSync: e.target.checked,
                        },
                      }));
                    }}
                    className="w-4 h-4 mt-0.5 text-emerald-600 border-slate-300 rounded-sm focus:ring-emerald-500"
                  />
                  <div className="space-y-0.5">
                    <label
                      htmlFor="auto-sync-sheets"
                      className="text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      Otomatis Sinkronkan Setiap Transaksi Penjualan Baru ke Spreadsheet (Real-time)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Saat kasir menekan tombol "Selesaikan Transaksi", struk transaksi dan daftar rincian barang otomatis langsung ditambahkan ke baris baru Spreadsheet.
                    </p>
                    {formSettings.googleSheetsConfig?.lastSync && (
                      <p className="text-[10px] text-emerald-700 font-mono pt-1">
                        Terakhir sinkronisasi: {formSettings.googleSheetsConfig.lastSync}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Feedback Notifications */}
              {sheetsSyncMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    sheetsSyncMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : sheetsSyncMsg.type === 'error'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}
                >
                  {sheetsSyncMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  )}
                  <span className="font-medium leading-relaxed">{sheetsSyncMsg.text}</span>
                </div>
              )}

              {sheetsTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    sheetsTestResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {sheetsTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{sheetsTestResult.message}</span>
                </div>
              )}

              {/* Action Buttons for Sheets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={testingSheets || !formSettings.googleSheetsConfig?.spreadsheetId}
                  onClick={handleTestGoogleSheets}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingSheets ? 'animate-spin' : ''}`} />
                  <span>{testingSheets ? 'Memeriksa...' : 'Uji Koneksi Spreadsheet'}</span>
                </button>

                <button
                  type="button"
                  disabled={sheetsSyncLoading || !formSettings.googleSheetsConfig?.spreadsheetId}
                  onClick={handleSyncToSheets}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{sheetsSyncLoading ? 'Sinkronisasi...' : 'Unggah & Sinkronkan ke Sheets'}</span>
                </button>

                <button
                  type="button"
                  disabled={sheetsSyncLoading || !formSettings.googleSheetsConfig?.spreadsheetId}
                  onClick={handlePullFromSheets}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>Tarik Data dari Spreadsheet</span>
                </button>
              </div>

              {/* Apps Script Webhook Option Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Opsi alternatif: Ingin menggunakan Google Apps Script Webhook tanpa login Google di perangkat kasir?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAppsScriptModal(!showAppsScriptModal)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{showAppsScriptModal ? 'Tutup Pengaturan Webhook' : 'Pengaturan Apps Script Webhook'}</span>
                  </button>
                </div>

                {showAppsScriptModal && (
                  <div className="mt-3 p-4 bg-slate-900 rounded-xl text-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Google Apps Script Webhook Handler</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAppsScript}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                      >
                        {copiedAppsScript ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Kode Apps Script</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        URL Web App Google Apps Script (Opsional):
                      </label>
                      <input
                        type="text"
                        value={formSettings.googleSheetsConfig?.webhookUrl || ''}
                        onChange={(e) =>
                          setFormSettings((prev) => ({
                            ...prev,
                            googleSheetsConfig: {
                              ...(prev.googleSheetsConfig || { enabled: true, spreadsheetId: '', autoSync: true }),
                              webhookUrl: e.target.value,
                            },
                          }))
                        }
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-700 bg-slate-950 text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Petunjuk: Buka <strong>script.google.com</strong> &rarr; Buat Project Baru &rarr; Tempelkan kode skrip di bawah ini &rarr; Klik <strong>Deploy &gt; New deployment &gt; Web app</strong> &rarr; Atur Access: <em>Anyone</em> &rarr; Tempel URL Web App ke kolom di atas.
                    </p>

                    <pre className="max-h-48 overflow-y-auto text-[10px] font-mono p-3 bg-slate-950 rounded-lg text-emerald-300 select-all leading-relaxed">
                      {APPS_SCRIPT_TEMPLATE_CODE}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: PENGATURAN LOGO APLIKASI & LOGO PERUSAHAAN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-5 h-5" style={{ color: currentTheme.primaryHex }} />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Pengaturan Logo Aplikasi & Logo Perusahaan
                </h3>
                <p className="text-[11px] text-slate-400">
                  Kustomisasi identitas visual aplikasi untuk bilah navigasi, header, layar login, serta kop struk nota & faktur
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Logo Aplikasi */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      1. Logo Aplikasi (App Logo)
                    </h4>
                  </div>
                  {formSettings.appLogoUrl ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Kustom Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      Ikon Bawaan
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Logo ini ditampilkan pada bilah header atas, menu navigasi sidebar, dan halaman login akun kasir & admin.
                </p>

                {/* Preview Box */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Pratinjau Tampilan Logo:
                  </span>
                  <div className="flex items-center gap-4">
                    {/* Dark Preview (Sidebar / Login) */}
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5 shadow-xs">
                        {formSettings.appLogoUrl ? (
                          <img
                            src={formSettings.appLogoUrl}
                            alt="Pratinjau Gelap"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">Latar Gelap (Sidebar/Login)</span>
                    </div>

                    {/* Light Preview (Header) */}
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-1.5 shadow-xs">
                        {formSettings.appLogoUrl ? (
                          <img
                            src={formSettings.appLogoUrl}
                            alt="Pratinjau Terang"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">Latar Terang (Header)</span>
                    </div>
                  </div>
                </div>

                {/* Upload or URL Inputs */}
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Unggah Berkas Gambar Logo (PNG / JPG / SVG / WebP):
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white cursor-pointer transition-colors text-slate-600 hover:text-indigo-600 font-medium">
                      <UploadCloud className="w-4 h-4" />
                      <span>Pilih File Gambar dari Komputer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadAppLogo}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Atau Masukkan Tautan / URL Logo:
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo-aplikasi.png"
                      value={formSettings.appLogoUrl || ''}
                      onChange={(e) =>
                        setFormSettings((prev) => ({ ...prev, appLogoUrl: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {formSettings.appLogoUrl && (
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setFormSettings((prev) => ({ ...prev, appLogoUrl: '' }))}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Logo (Gunakan Ikon Bawaan)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Logo Perusahaan / Toko */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      2. Logo Perusahaan / Toko (Company Logo)
                    </h4>
                  </div>
                  {formSettings.companyLogoUrl ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Logo Kop Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      Teks Bawaan
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Logo resmi ini dicetak pada Kop Struk Nota Kasir Thermal (58mm/80mm), Faktur Penjualan A4, Surat Jalan, dan Dokumen Laporan.
                </p>

                {/* Preview Box Kop Struk/Faktur */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Pratinjau Kop Struk & Faktur:
                  </span>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs shrink-0">
                      {formSettings.companyLogoUrl ? (
                        <img
                          src={formSettings.companyLogoUrl}
                          alt="Logo Perusahaan"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Store className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-800 text-xs truncate">
                        {formSettings.storeName || 'NAMA TOKO MATERIAL'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {formSettings.tagline || 'Pusat Bahan Bangunan Terlengkap'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {formSettings.address || 'Jl. Raya Utama No. 123'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload or URL Inputs */}
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Unggah Berkas Logo Perusahaan (PNG / JPG / SVG):
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-white cursor-pointer transition-colors text-slate-600 hover:text-emerald-600 font-medium">
                      <UploadCloud className="w-4 h-4" />
                      <span>Pilih File Logo Kop Toko</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadCompanyLogo}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Atau Masukkan Tautan / URL Logo Perusahaan:
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo-toko-bangunan.png"
                      value={formSettings.companyLogoUrl || ''}
                      onChange={(e) =>
                        setFormSettings((prev) => ({ ...prev, companyLogoUrl: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {formSettings.companyLogoUrl && (
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setFormSettings((prev) => ({ ...prev, companyLogoUrl: '' }))}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Logo (Gunakan Teks Toko Biasa)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: STORE PROFILE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Store className="w-5 h-5" style={{ color: currentTheme.primaryHex }} />
            <h3 className="font-bold text-slate-800 text-sm">Profil & Identitas Toko Material</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-700">Nama Toko Material:</label>
              <input
                type="text"
                required
                value={formSettings.storeName}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, storeName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Slogan / Keterangan Toko:</label>
              <input
                type="text"
                value={formSettings.tagline}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, tagline: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nomor Telepon / WhatsApp Toko:</label>
              <input
                type="text"
                required
                value={formSettings.phone}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, phone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-700">Alamat Lengkap Toko:</label>
              <textarea
                rows={2}
                required
                value={formSettings.address}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, address: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: RECEIPT & TAX CONFIGURATION */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Receipt className="w-5 h-5" style={{ color: currentTheme.primaryHex }} />
            <h3 className="font-bold text-slate-800 text-sm">
              Pengaturan Format Struk & Pajak (PPN)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Pajak Pertambahan Nilai (PPN %):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formSettings.taxPercentage}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      taxPercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
                <span className="absolute right-3 top-2 font-bold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Isi 0 jika toko Anda belum mengenakan PPN pada nota transaksi kasir.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Format Kertas Nota:</label>
              <input
                type="text"
                disabled
                value="Struk Kasir Termal 80mm / 58mm & Faktur A4"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-700">
                Catatan Kaki Struk (Footer Nota):
              </label>
              <textarea
                rows={2}
                value={formSettings.receiptFooter}
                onChange={(e) =>
                  setFormSettings({
                    ...formSettings,
                    receiptFooter: e.target.value,
                  })
                }
                placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar kecuali ada perjanjian."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: BANK TRANSFER ACCOUNTS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" style={{ color: currentTheme.primaryHex }} />
              <h3 className="font-bold text-slate-800 text-sm">
                Rekening Bank Pembayaran (Transfer)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddBank}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors"
              style={{
                backgroundColor: currentTheme.lightHex,
                borderColor: currentTheme.primaryHex,
                color: currentTheme.primaryHex,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rekening</span>
            </button>
          </div>

          <div className="space-y-3">
            {formSettings.bankAccounts.map((b, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs"
              >
                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-400 block">Nama Bank:</label>
                  <input
                    type="text"
                    value={b.bank}
                    onChange={(e) => handleUpdateBank(idx, 'bank', e.target.value)}
                    placeholder="BCA / Mandiri / BRI"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-slate-400 block">Nomor Rekening:</label>
                  <input
                    type="text"
                    value={b.accountNo}
                    onChange={(e) => handleUpdateBank(idx, 'accountNo', e.target.value)}
                    placeholder="1234-5678-90"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-semibold bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-slate-400 block">Atas Nama (Owner):</label>
                  <input
                    type="text"
                    value={b.accountHolder}
                    onChange={(e) => handleUpdateBank(idx, 'accountHolder', e.target.value)}
                    placeholder="TB. Maju Jaya"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-1 text-center pt-3 sm:pt-0">
                  {formSettings.bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="text-slate-300 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: ROLE-BASED ACCESS CONTROL OVERVIEW */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5" style={{ color: currentTheme.primaryHex }} />
            <h3 className="font-bold text-slate-800 text-sm">
              Hak Akses & Pengguna Sistem (Role-Based Access Control)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {users.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                  style={{
                    borderColor: isCurrent ? currentTheme.primaryHex : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{u.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'cashier'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.roleLabel || u.role}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>
                      Username: <span className="font-mono text-slate-700">{u.username}</span>
                    </p>
                    <p>
                      PIN Akses: <span className="font-mono text-slate-700">{u.pin}</span>
                    </p>
                  </div>

                  {isCurrent && (
                    <span
                      className="text-[10px] font-bold flex items-center gap-1"
                      style={{ color: currentTheme.primaryHex }}
                    >
                      <Check className="w-3 h-3" /> Sedang Aktif Sekarang
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 italic">
            * Anda dapat berganti akun atau hak akses kapan saja melalui tombol profil di bilah atas (Header) atau keluar ke halaman Login.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold border border-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset ke Sampel Data Bawaan</span>
          </button>

          <button
            id="btn-save-settings-main"
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:brightness-105 active:scale-98"
            style={{ backgroundColor: currentTheme.primaryHex }}
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Perubahan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
