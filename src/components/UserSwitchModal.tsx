import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Role } from '../types';
import { ShieldCheck, UserCheck, X, KeyRound, Check } from 'lucide-react';

interface UserSwitchModalProps {
  onClose: () => void;
}

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({ onClose }) => {
  const { users, currentUser, setCurrentUser } = useApp();
  const [selectedUser, setSelectedUser] = useState<User>(currentUser);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setPinInput('');
    setErrorMsg('');
  };

  const handleConfirmSwitch = () => {
    if (selectedUser.pin && pinInput !== selectedUser.pin) {
      setErrorMsg(`PIN salah! (Hint PIN demo: ${selectedUser.pin})`);
      return;
    }
    setCurrentUser(selectedUser);
    onClose();
  };

  const getRoleDesc = (role: Role) => {
    switch (role) {
      case 'owner':
        return 'Akses penuh ke semua laporan, laba rugi, omset toko, piutang & hutang.';
      case 'admin':
        return 'Akses penuh ke semua modul sistem termasuk pengaturan toko dan hak akses user.';
      case 'cashier':
        return 'Fokus transaksi Kasir POS, pencatatan pembayaran tempo, riwayat transaksi, dan cetak nota.';
      case 'warehouse':
        return 'Fokus manajemen stok fisik, stok opname, input faktur penerimaan barang dari supplier.';
    }
  };

  return (
    <div
      id="user-switch-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        id="user-switch-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Ganti Akun & Hak Akses</h3>
              <p className="text-xs text-slate-500">Pilih profil operator toko bangunan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilih Operator:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {users.map((u) => {
                const isSelected = selectedUser.id === u.id;
                const isCurrent = currentUser.id === u.id;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        u.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800 text-xs truncate">{u.name}</p>
                        {isCurrent && (
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold">{u.roleLabel}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role details */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Kewenangan: {selectedUser.roleLabel}</span>
            </div>
            <p className="text-slate-500 text-[11px]">{getRoleDesc(selectedUser.role)}</p>
          </div>

          {/* PIN input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                Masukkan PIN Otorisasi:
              </label>
              <span className="text-[11px] text-slate-400">PIN Demo: {selectedUser.pin}</span>
            </div>
            <input
              id="input-user-pin"
              type="password"
              placeholder="Masukkan 4 digit PIN..."
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setErrorMsg('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmSwitch();
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono tracking-widest"
              maxLength={6}
            />
            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-xs font-semibold"
          >
            Batal
          </button>
          <button
            id="btn-confirm-switch-user"
            type="button"
            onClick={handleConfirmSwitch}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            Beralih Pengguna
          </button>
        </div>
      </div>
    </div>
  );
};
