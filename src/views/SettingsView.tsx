import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StoreSettings, ThemeColor } from '../types';
import { THEME_OPTIONS, getTheme, applyThemeToDocument } from '../utils/theme';
import {
  testSpreadsheetConnection,
  extractSpreadsheetId,
} from '../lib/googleSheets';
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
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
  Building2,
  UploadCloud,
  X,
  FileSpreadsheet,
  Link2,
  Table,
  CheckCircle,
  Zap,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    users,
    currentUser,
    resetToDefaultData,
    googleUser,
    googleAccessToken,
    isGoogleConnected,
    loginWithGoogle,
    logoutGoogle,
    syncToGoogleSheets,
    pullFromGoogleSheetsData,
    createAndConnectSpreadsheet,
    connectExistingSpreadsheet,
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
  });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Spreadsheet ID input state
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState<string>(
    settings.googleSheetsConfig?.spreadsheetId || ''
  );
  const [connectingDatabase, setConnectingDatabase] = useState<boolean>(false);
  const [creatingNewSheet, setCreatingNewSheet] = useState<boolean>(false);
  const [testingSheets, setTestingSheets] = useState<boolean>(false);
  const [sheetsSyncLoading, setSheetsSyncLoading] = useState<boolean>(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

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

  // Google Authentication Handlers
  const handleGoogleSignIn = async () => {
    setSheetsSyncMsg(null);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        setSheetsSyncMsg({
          type: 'success',
          text: 'Berhasil login ke Google! Akun Google Anda kini siap mengakses dan membuat database Spreadsheet.',
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
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setSheetsSyncMsg({
      type: 'info',
      text: 'Akun Google berhasil logout.',
    });
  };

  // AUTO CREATE DATABASE SPREADSHEET HANYA DENGAN ID ATAU LINK
  const handleAutoCreateDatabase = async () => {
    const rawInput = spreadsheetIdInput.trim();
    if (!rawInput) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Silakan masukkan ID Spreadsheet Anda terlebih dahulu.',
      });
      return;
    }

    const cleanId = extractSpreadsheetId(rawInput);
    if (!cleanId || cleanId.length < 15) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Format ID Spreadsheet tidak valid. ID spreadsheet biasanya terdiri dari ~44 karakter (contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms) atau tempel link URL lengkap dari browser.',
      });
      return;
    }

    setConnectingDatabase(true);
    setSheetsSyncMsg(null);

    try {
      // 1. Pastikan sudah login ke akun Google
      let activeToken = googleAccessToken;
      if (!activeToken) {
        setSheetsSyncMsg({
          type: 'info',
          text: 'Membuka login Google untuk memberikan izin baca dan tulis ke Spreadsheet Anda...',
        });
        const loginRes = await loginWithGoogle();
        if (loginRes.cancelled) {
          setSheetsSyncMsg({
            type: 'info',
            text: 'Login Google dibatalkan. Silakan login terlebih dahulu untuk menghubungkan database spreadsheet.',
          });
          setConnectingDatabase(false);
          return;
        }
        if (!loginRes.success || !loginRes.token) {
          setSheetsSyncMsg({
            type: 'error',
            text: loginRes.error || 'Gagal login ke Google. Izin akses diperlukan untuk mengelola spreadsheet.',
          });
          setConnectingDatabase(false);
          return;
        }
        activeToken = loginRes.token;
      }

      setSheetsSyncMsg({
        type: 'info',
        text: 'Sedang memeriksa lembar kerja dan membuat 7 tabel database toko otomatis...',
      });

      // 2. Hubungkan & auto-create 7 tabel (Produk, Transaksi, Item_Transaksi, Pelanggan, Pemasok, Pembelian, Pengaturan)
      let res = await connectExistingSpreadsheet(cleanId, activeToken);

      // Jika token kadaluarsa, coba login ulang
      if (!res.success && res.requiresGoogleLogin) {
        const retryLogin = await loginWithGoogle();
        if (retryLogin.success && retryLogin.token) {
          activeToken = retryLogin.token;
          res = await connectExistingSpreadsheet(cleanId, activeToken);
        }
      }

      if (res.success && res.spreadsheetId) {
        // 3. Langsung sinkronkan data toko yang ada ke spreadsheet
        setSheetsSyncMsg({
          type: 'info',
          text: 'Menyinkronkan data barang, pelanggan, dan transaksi ke lembar kerja baru...',
        });
        await syncToGoogleSheets(res.spreadsheetId);

        const fullUrl = res.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/edit`;
        const updatedConfig = {
          enabled: true,
          spreadsheetId: res.spreadsheetId,
          spreadsheetUrl: fullUrl,
          spreadsheetName: res.spreadsheetTitle || `Database POS - ${res.spreadsheetId}`,
          autoSync: true,
          lastSync: new Date().toLocaleString('id-ID'),
        };

        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: updatedConfig,
        }));
        updateSettings({
          googleSheetsConfig: updatedConfig,
        });

        setSpreadsheetIdInput(res.spreadsheetId);
        setSheetsSyncMsg({
          type: 'success',
          text: `✅ Database Google Spreadsheet berhasil dibuat dan terhubung ke "${res.spreadsheetTitle || res.spreadsheetId}"! Seluruh tabel (Produk, Transaksi, Item_Transaksi, Pelanggan, Pemasok, Pembelian, Pengaturan) telah siap dan data toko telah disinkronkan.`,
        });
      } else {
        setSheetsSyncMsg({
          type: 'error',
          text: res.message || 'Gagal menghubungkan dan membuat database spreadsheet.',
        });
      }
    } catch (err: any) {
      setSheetsSyncMsg({
        type: 'error',
        text: `Terjadi kendala: ${err.message || String(err)}`,
      });
    } finally {
      setConnectingDatabase(false);
    }
  };

  // Opsi 1-Klik Buat Spreadsheet Baru di Google Drive
  const handleCreateNewDatabaseSpreadsheet = async () => {
    setCreatingNewSheet(true);
    setSheetsSyncMsg(null);
    try {
      let activeToken = googleAccessToken;
      if (!activeToken) {
        const loginRes = await loginWithGoogle();
        if (loginRes.cancelled || !loginRes.success || !loginRes.token) {
          setSheetsSyncMsg({
            type: 'info',
            text: 'Login Google diperlukan untuk membuat file spreadsheet di Google Drive Anda.',
          });
          setCreatingNewSheet(false);
          return;
        }
        activeToken = loginRes.token;
      }

      setSheetsSyncMsg({
        type: 'info',
        text: 'Sedang membuat Google Spreadsheet baru lengkap dengan 7 tabel di Google Drive Anda...',
      });

      const res = await createAndConnectSpreadsheet(formSettings.storeName);
      if (res.success && res.spreadsheetId) {
        await syncToGoogleSheets(res.spreadsheetId);

        const updatedConfig = {
          enabled: true,
          spreadsheetId: res.spreadsheetId,
          spreadsheetUrl: res.spreadsheetUrl,
          spreadsheetName: `Database POS - ${formSettings.storeName}`,
          autoSync: true,
          lastSync: new Date().toLocaleString('id-ID'),
        };

        setFormSettings((prev) => ({
          ...prev,
          googleSheetsConfig: updatedConfig,
        }));
        updateSettings({
          googleSheetsConfig: updatedConfig,
        });

        setSpreadsheetIdInput(res.spreadsheetId);
        setSheetsSyncMsg({
          type: 'success',
          text: `✅ File Google Spreadsheet baru berhasil dibuat di Drive Anda dengan ID: ${res.spreadsheetId}! Database telah aktif dan data tersinkron.`,
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
      setCreatingNewSheet(false);
    }
  };

  // Putuskan Spreadsheet
  const handleDisconnectSpreadsheet = () => {
    if (window.confirm('Apakah Anda ingin memutuskan koneksi Google Spreadsheet saat ini?')) {
      const updatedConfig = {
        enabled: false,
        spreadsheetId: '',
        spreadsheetUrl: '',
        spreadsheetName: '',
        autoSync: false,
      };
      setFormSettings((prev) => ({
        ...prev,
        googleSheetsConfig: updatedConfig,
      }));
      updateSettings({
        googleSheetsConfig: updatedConfig,
      });
      setSpreadsheetIdInput('');
      setSheetsSyncMsg({
        type: 'info',
        text: 'Koneksi Spreadsheet diputuskan. Silakan masukkan ID Spreadsheet baru di bawah.',
      });
    }
  };

  // Uji Koneksi Spreadsheet
  const handleTestGoogleSheets = async () => {
    const rawId = formSettings.googleSheetsConfig?.spreadsheetId || spreadsheetIdInput;
    if (!rawId) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'Masukkan ID Spreadsheet terlebih dahulu.',
      });
      return;
    }

    setTestingSheets(true);
    try {
      const res = await testSpreadsheetConnection(rawId, googleAccessToken);
      if (res.success) {
        setSheetsSyncMsg({
          type: 'success',
          text: `Koneksi berhasil! Lembar kerja "${res.spreadsheetTitle || rawId}" dapat diakses.`,
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
        text: `Koneksi gagal: ${err.message || String(err)}`,
      });
    } finally {
      setTestingSheets(false);
    }
  };

  // Sinkronkan Data Toko ke Spreadsheet
  const handleSyncToSheets = async () => {
    const rawId = formSettings.googleSheetsConfig?.spreadsheetId;
    if (!rawId) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'ID Spreadsheet belum terhubung. Masukkan ID Spreadsheet terlebih dahulu.',
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

  // Tarik Data dari Spreadsheet
  const handlePullFromSheets = async () => {
    const rawId = formSettings.googleSheetsConfig?.spreadsheetId;
    if (!rawId) {
      setSheetsSyncMsg({
        type: 'error',
        text: 'ID Spreadsheet belum terhubung.',
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

  // Submit Settings Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
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
            Pengaturan Toko, Tema & Database Google Spreadsheet
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur tema warna antarmuka, database Google Spreadsheet, logo aplikasi, format cetak struk nota, tarif pajak PPN, dan rekening pembayaran.
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

        {/* SECTION 2: DATABASE GOOGLE SPREADSHEET (AUTO CREATE DATABASE) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Database Google Spreadsheet (Auto Create Database)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Cloud Database
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cukup masukkan ID Spreadsheet Anda. Sistem akan otomatis membuat semua sheet database toko, memformat kolom, dan menyinkronkan data secara otomatis.
                </p>
              </div>
            </div>

            {/* Connection Badge */}
            <div className="shrink-0 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  formSettings.googleSheetsConfig?.spreadsheetId
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isGoogleConnected
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    formSettings.googleSheetsConfig?.spreadsheetId
                      ? 'bg-emerald-500 animate-pulse'
                      : isGoogleConnected
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                />
                {formSettings.googleSheetsConfig?.spreadsheetId
                  ? 'Spreadsheet Terhubung & Aktif'
                  : isGoogleConnected
                  ? 'Google Terhubung (Masukkan ID)'
                  : 'Belum Terhubung'}
              </span>
            </div>
          </div>

          {/* Feedback & Status Message */}
          {sheetsSyncMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                sheetsSyncMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : sheetsSyncMsg.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              {sheetsSyncMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : sheetsSyncMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 animate-spin" />
              )}
              <div className="flex-1 leading-relaxed font-medium">
                {sheetsSyncMsg.text}
              </div>
              <button
                type="button"
                onClick={() => setSheetsSyncMsg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Google Account Authentication Status */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {googleUser ? (
                googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google'}
                    className="w-8 h-8 rounded-full border border-slate-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center">
                  G
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {googleUser ? (googleUser.displayName || 'Akun Google Terhubung') : 'Otentikasi Akun Google'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {googleUser ? googleUser.email : 'Login Google untuk memberi izin baca/tulis data ke lembar kerja.'}
                </p>
              </div>
            </div>

            {googleUser ? (
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shrink-0"
              >
                Ganti Akun / Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-all active:scale-95 shrink-0"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {/* Core Input Form: ID Spreadsheet */}
          <div className="p-4 bg-emerald-50/40 rounded-2xl border-2 border-emerald-300 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label htmlFor="input-spreadsheet-id" className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-600" />
                <span>Masukkan ID Spreadsheet Anda:</span>
              </label>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka sheets.new untuk buat file kosong ↗</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Cukup tempelkan <strong>ID Spreadsheet</strong> (contoh: <code>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</code>) atau <strong>Link URL lengkap</strong> dari address bar browser. Sistem akan otomatis mendeteksi sheet kosong, membuat 7 tabel database kasir (Produk, Transaksi, Item_Transaksi, Pelanggan, Pemasok, Pembelian, Pengaturan), memberi warna header hijau, dan menyinkronkan data toko.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="input-spreadsheet-id"
                  type="text"
                  value={spreadsheetIdInput}
                  onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                  placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms atau link URL"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-8"
                />
                {spreadsheetIdInput && (
                  <button
                    type="button"
                    onClick={() => setSpreadsheetIdInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Hapus input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={connectingDatabase || !spreadsheetIdInput.trim()}
                onClick={handleAutoCreateDatabase}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Sparkles className={`w-4 h-4 ${connectingDatabase ? 'animate-spin' : ''}`} />
                <span>{connectingDatabase ? 'Menyiapkan 7 Tabel Database...' : 'Hubungkan & Auto Create Database'}</span>
              </button>
            </div>

            {/* Quick 1-Click Helper Option */}
            <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Belum punya lembar kerja Spreadsheet sama sekali?
              </span>
              <button
                type="button"
                disabled={creatingNewSheet}
                onClick={handleCreateNewDatabaseSpreadsheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-2xs transition-colors disabled:opacity-50"
              >
                <Plus className={`w-3.5 h-3.5 text-emerald-600 ${creatingNewSheet ? 'animate-spin' : ''}`} />
                <span>{creatingNewSheet ? 'Sedang Membuat...' : 'Buat Spreadsheet Baru Otomatis (1-Klik)'}</span>
              </button>
            </div>
          </div>

          {/* Connected Spreadsheet Details & Action Controls */}
          {formSettings.googleSheetsConfig?.spreadsheetId && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800">
                      {formSettings.googleSheetsConfig.spreadsheetName || 'Database Spreadsheet Aktif'}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {formSettings.googleSheetsConfig.spreadsheetId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={
                      formSettings.googleSheetsConfig.spreadsheetUrl ||
                      `https://docs.google.com/spreadsheets/d/${formSettings.googleSheetsConfig.spreadsheetId}/edit`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Lembar Kerja di Google Drive ↗</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDisconnectSpreadsheet}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-medium transition-colors"
                    title="Putuskan koneksi agar bisa memasukkan ID spreadsheet baru"
                  >
                    Putuskan / Ganti ID
                  </button>
                </div>
              </div>

              {/* Action Buttons for Data Sync & Pull */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={testingSheets}
                  onClick={handleTestGoogleSheets}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingSheets ? 'animate-spin' : ''}`} />
                  <span>{testingSheets ? 'Menguji...' : 'Uji Koneksi Spreadsheet'}</span>
                </button>

                <button
                  type="button"
                  disabled={sheetsSyncLoading}
                  onClick={handleSyncToSheets}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{sheetsSyncLoading ? 'Menyinkronkan...' : 'Sinkronkan Data Sekarang (Upload)'}</span>
                </button>

                <button
                  type="button"
                  disabled={sheetsSyncLoading}
                  onClick={handlePullFromSheets}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>Tarik Data dari Spreadsheet</span>
                </button>
              </div>

              {/* Realtime Auto-Sync Checkbox */}
              <div className="pt-2 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="auto-sync-realtime-checkbox"
                  checked={formSettings.googleSheetsConfig?.autoSync !== false}
                  onChange={(e) => {
                    const updatedConfig = {
                      ...(formSettings.googleSheetsConfig || { enabled: true, spreadsheetId: '' }),
                      autoSync: e.target.checked,
                    };
                    setFormSettings((prev) => ({
                      ...prev,
                      googleSheetsConfig: updatedConfig,
                    }));
                    updateSettings({
                      googleSheetsConfig: updatedConfig,
                    });
                  }}
                  className="w-4 h-4 mt-0.5 text-emerald-600 border-slate-300 rounded-sm focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <label
                    htmlFor="auto-sync-realtime-checkbox"
                    className="text-xs font-bold text-slate-800 cursor-pointer block"
                  >
                    Otomatis Sinkronkan Setiap Transaksi Penjualan Baru ke Spreadsheet (Real-time)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Setiap kasir menyelesaikan penjualan dan mencetak struk nota, data transaksi dan rincian item otomatis langsung masuk ke baris baru Spreadsheet.
                  </p>
                  {formSettings.googleSheetsConfig?.lastSync && (
                    <p className="text-[10px] text-emerald-700 font-mono pt-1">
                      Terakhir sinkronisasi: {formSettings.googleSheetsConfig.lastSync}
                    </p>
                  )}
                </div>
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
