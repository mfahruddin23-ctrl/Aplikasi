import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/theme';
import {
  Clock,
  ArrowLeftRight,
  ShieldCheck,
  Building2,
  Phone,
  LogOut,
  Sparkles,
  Menu,
  FileSpreadsheet,
} from 'lucide-react';

interface HeaderProps {
  onOpenConverter: () => void;
  onOpenUserSwitch: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenConverter,
  onOpenUserSwitch,
  onToggleMobileMenu,
}) => {
  const { settings, currentUser, logout, isSupabaseActive } = useApp();
  const theme = getTheme(settings.themeColor);
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'admin':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'warehouse':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <header
      id="app-top-header"
      className="bg-white border-b border-slate-200/80 px-4 lg:px-6 py-3 sticky top-0 z-30 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Store info & time */}
        <div className="flex items-center space-x-3">
          {onToggleMobileMenu && (
            <button
              id="btn-mobile-sidebar-toggle"
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {settings.appLogoUrl || settings.companyLogoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0 p-1">
              <img
                src={settings.appLogoUrl || settings.companyLogoUrl}
                alt={settings.storeName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold shadow-md shrink-0"
              style={{ backgroundColor: theme.primaryHex }}
            >
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-800 tracking-tight text-base sm:text-lg">
                {settings.storeName}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Toko Buka
              </span>
              {(settings.googleSheetsConfig?.spreadsheetId || settings.googleSheetsConfig?.webhookUrl) && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Google Sheets</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {time}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
                <Phone className="w-3 h-3" />
                {settings.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick actions & active user */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {/* Quick Unit Converter Button */}
          <button
            id="btn-quick-unit-converter"
            type="button"
            onClick={onOpenConverter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            title="Kalkulator Konversi Satuan Material"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Kalkulator</span> Satuan
          </button>

          {/* User Profile & Switcher */}
          <div
            id="user-profile-widget"
            onClick={onOpenUserSwitch}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors group"
            title="Klik untuk Ganti User / Role"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold ring-2 ring-emerald-600/20 overflow-hidden">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-sm border font-semibold ${getRoleBadgeColor(
                    currentUser.role
                  )}`}
                >
                  {currentUser.roleLabel}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Ganti akun / PIN</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            id="btn-header-logout"
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
            title="Keluar / Logout ke Halaman Login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
