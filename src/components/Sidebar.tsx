import React from 'react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/theme';
import {
  LayoutDashboard,
  ShoppingCart,
  Database,
  Boxes,
  ArrowLeftRight,
  Users,
  Truck,
  ClipboardCheck,
  BarChart3,
  Settings,
  ShieldAlert,
  HardHat,
  ChevronRight,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'master-data'
  | 'materials'
  | 'converter'
  | 'customers'
  | 'suppliers'
  | 'stock'
  | 'reports'
  | 'settings'
  | 'users';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, materials, customers, settings, logout, isSupabaseActive } = useApp();
  const theme = getTheme(settings.themeColor);

  // Count items with stock <= minStock
  const lowStockCount = materials.filter((m) => m.stock <= m.minStock).length;
  // Count customers with debt > 0
  const customersWithDebtCount = customers.filter((c) => c.currentDebt > 0).length;

  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'owner', 'cashier', 'warehouse'],
    },
    {
      id: 'pos' as NavTab,
      label: 'Kasir POS Material',
      icon: ShoppingCart,
      badge: 'Kasir',
      allowedRoles: ['admin', 'owner', 'cashier'],
    },
    {
      id: 'master-data' as NavTab,
      label: 'Master Data',
      icon: Database,
      badge: 'Barang & Kategori',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      allowedRoles: ['admin', 'owner', 'cashier', 'warehouse'],
    },
    {
      id: 'materials' as NavTab,
      label: 'Data Barang / Material',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} menipis` : undefined,
      badgeColor: 'bg-amber-100 text-amber-700',
      allowedRoles: ['admin', 'owner', 'cashier', 'warehouse'],
    },
    {
      id: 'converter' as NavTab,
      label: 'Fitur Konversi Satuan',
      icon: ArrowLeftRight,
      allowedRoles: ['admin', 'owner', 'cashier', 'warehouse'],
    },
    {
      id: 'customers' as NavTab,
      label: 'Pelanggan & Piutang',
      icon: Users,
      badge: customersWithDebtCount > 0 ? `${customersWithDebtCount} tempo` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700',
      allowedRoles: ['admin', 'owner', 'cashier'],
    },
    {
      id: 'suppliers' as NavTab,
      label: 'Supplier & Pembelian',
      icon: Truck,
      allowedRoles: ['admin', 'owner', 'warehouse'],
    },
    {
      id: 'stock' as NavTab,
      label: 'Manajemen Stok & Opname',
      icon: ClipboardCheck,
      allowedRoles: ['admin', 'owner', 'warehouse'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Laporan & Laba Rugi',
      icon: BarChart3,
      allowedRoles: ['admin', 'owner'],
    },
    {
      id: 'settings' as NavTab,
      label: 'Pengaturan Toko',
      icon: Settings,
      allowedRoles: ['admin', 'owner'],
    },
    {
      id: 'users' as NavTab,
      label: 'Manajemen Hak Akses',
      icon: ShieldAlert,
      allowedRoles: ['admin', 'owner'],
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.appLogoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                <img
                  src={settings.appLogoUrl}
                  alt="Logo Aplikasi"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black shadow-lg shrink-0"
                style={{ backgroundColor: theme.primaryHex }}
              >
                <HardHat className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">
                POS MATERIAL
              </span>
              <span className="text-[11px] font-medium" style={{ color: theme.primaryHex }}>
                Toko Bangunan V2.5
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Operasional
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isAllowed = item.allowedRoles.includes(currentUser.role);

            if (!isAllowed) {
              return null; // hide menu not allowed for role
            }

            return (
              <button
                id={`sidebar-nav-${item.id}`}
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                style={{
                  backgroundColor: isActive ? theme.primaryHex : undefined,
                }}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        item.badgeColor || (isActive ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Low Stock Warning Banner in Sidebar */}
        {lowStockCount > 0 && (
          <div className="p-3 mx-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            <div className="flex items-center space-x-2 font-bold text-[11px] mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Peringatan Stok</span>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-relaxed">
              Ada {lowStockCount} material bangunan di bawah batas stok minimal.
            </p>
          </div>
        )}

        {/* Footer Role Info & Logout */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                style={{ backgroundColor: theme.primaryHex }}
              />
              <div className="text-[11px] truncate">
                <p className="font-bold text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-slate-400 text-[10px]">{currentUser.roleLabel}</p>
              </div>
            </div>

            <button
              id="sidebar-btn-logout"
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{isSupabaseActive ? 'Supabase Cloud' : 'Database Lokal'}</span>
            </span>
            <span className="font-mono text-slate-400">v2.5</span>
          </div>
        </div>
      </aside>
    </>
  );
};
