import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/theme';
import {
  Building2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { users, login, settings } = useApp();
  const theme = getTheme(settings.themeColor);

  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('1111');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Silakan isi username dan kata sandi.');
      return;
    }

    // Find matching user by username or email
    const matchedUser = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser ||
        (u.email && u.email.toLowerCase() === cleanUser)
    );

    if (!matchedUser) {
      setErrorMessage('Pengguna (username) tidak ditemukan. Periksa kembali.');
      return;
    }

    // Check password or PIN match
    const validPassword = matchedUser.password || matchedUser.pin;
    if (cleanPass === validPassword || cleanPass === matchedUser.pin) {
      login(matchedUser);
    } else {
      setErrorMessage('Kata sandi yang Anda masukkan salah.');
    }
  };

  const handleSelectQuickAccount = (uUsername: string, uPass: string) => {
    setUsername(uUsername);
    setPassword(uPass);
    setErrorMessage('');
  };

  const logoSrc = settings.appLogoUrl || settings.companyLogoUrl;

  return (
    <div
      id="login-view-container"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none"
    >
      {/* Background Decorative Ambient Glow */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ backgroundColor: theme.primaryHex }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: theme.primaryHex }}
      />

      <div className="w-full max-w-sm z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          {logoSrc ? (
            <div className="w-20 h-20 mx-auto rounded-2xl p-2 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center overflow-hidden">
              <img
                src={logoSrc}
                alt={settings.storeName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: theme.primaryHex }}
            >
              <Building2 className="w-9 h-9" />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {settings.storeName}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {settings.tagline || 'Sistem Kasir POS & Manajemen Stok Material Bangunan'}
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-6 shadow-2xl space-y-5">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4" style={{ color: theme.primaryHex }} />
              <span>Masuk ke Akun Anda</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Masukkan username dan password untuk akses sistem
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Username:</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="admin / kasir1 / owner..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-600"
                  style={{
                    outlineColor: theme.primaryHex,
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Password / Kata Sandi:</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Masukkan password..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-hidden focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-login"
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:brightness-110 active:scale-98"
              style={{ backgroundColor: theme.primaryHex }}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk (Login)</span>
            </button>
          </form>

          {/* Quick Account Hints for testing */}
          <div className="pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: theme.primaryHex }} />
                <span>Bantuan Akun & Akses Cepat</span>
              </span>
              <span className="text-[10px] text-slate-500 underline">
                {showDemoAccounts ? 'Sembunyikan' : 'Tampilkan'}
              </span>
            </button>

            {showDemoAccounts && (
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-1">
                {users.map((u) => {
                  const pass = u.password || u.pin;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectQuickAccount(u.username, pass)}
                      className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/80 hover:bg-slate-700/50 hover:border-slate-600 text-left transition-colors text-[11px]"
                    >
                      <div className="font-bold text-slate-200 truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono mt-0.5">
                        <span>@{u.username}</span>
                        <span className="text-slate-500 font-bold">{pass}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} {settings.storeName}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Hak Cipta Dilindungi &bull; Versi 2.5</p>
        </div>
      </div>
    </div>
  );
};
