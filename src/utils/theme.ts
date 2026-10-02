import { ThemeColor } from '../types';

export interface ThemeOption {
  id: ThemeColor;
  name: string;
  description: string;
  primaryHex: string;
  hoverHex: string;
  lightHex: string;
  gradientClass: string;
  badgeClass: string;
  btnClass: string;
  activeSidebarClass: string;
  textClass: string;
  borderClass: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Hijau',
    description: 'Warna standar klasik toko material bangunan & terpercaya',
    primaryHex: '#059669',
    hoverHex: '#047857',
    lightHex: '#ecfdf5',
    gradientClass: 'from-emerald-600 to-teal-700',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    activeSidebarClass: 'bg-emerald-600 text-white shadow-emerald-600/30',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500',
  },
  {
    id: 'blue',
    name: 'Royal Blue',
    description: 'Nuansa konstruksi sipil, arsitektur, & teknik terstruktur',
    primaryHex: '#2563eb',
    hoverHex: '#1d4ed8',
    lightHex: '#eff6ff',
    gradientClass: 'from-blue-600 to-indigo-700',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    activeSidebarClass: 'bg-blue-600 text-white shadow-blue-600/30',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-500',
  },
  {
    id: 'indigo',
    name: 'Indigo & Ungu Modern',
    description: 'Gaya modern, futuristik, & manajemen retail cerdas',
    primaryHex: '#4f46e5',
    hoverHex: '#4338ca',
    lightHex: '#eef2ff',
    gradientClass: 'from-indigo-600 to-purple-700',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    activeSidebarClass: 'bg-indigo-600 text-white shadow-indigo-600/30',
    textClass: 'text-indigo-600',
    borderClass: 'border-indigo-500',
  },
  {
    id: 'amber',
    name: 'Amber & Oranye Industri',
    description: 'Warna khas alat berat, excavator, keselamatan kerja & kayu',
    primaryHex: '#d97706',
    hoverHex: '#b45309',
    lightHex: '#fffbeb',
    gradientClass: 'from-amber-600 to-orange-700',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    activeSidebarClass: 'bg-amber-600 text-white shadow-amber-600/30',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-500',
  },
  {
    id: 'rose',
    name: 'Merah Bata Dinamis',
    description: 'Warna bata merah, atap genteng, tegas & bervolume tinggi',
    primaryHex: '#e11d48',
    hoverHex: '#be123c',
    lightHex: '#fff1f2',
    gradientClass: 'from-rose-600 to-red-700',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    activeSidebarClass: 'bg-rose-600 text-white shadow-rose-600/30',
    textClass: 'text-rose-600',
    borderClass: 'border-rose-500',
  },
  {
    id: 'slate',
    name: 'Slate & Abu-Abu Semen',
    description: 'Monokrom elegan nuansa beton cor, semen, & baja minimalis',
    primaryHex: '#475569',
    hoverHex: '#334155',
    lightHex: '#f8fafc',
    gradientClass: 'from-slate-700 to-slate-900',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    btnClass: 'bg-slate-700 hover:bg-slate-800 text-white',
    activeSidebarClass: 'bg-slate-800 text-white shadow-slate-900/30',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-600',
  },
];

export function getTheme(themeId?: ThemeColor): ThemeOption {
  return THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];
}

export function applyThemeToDocument(themeId: ThemeColor = 'emerald'): void {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.style.setProperty('--theme-primary', theme.primaryHex);
  root.style.setProperty('--theme-primary-hover', theme.hoverHex);
  root.style.setProperty('--theme-primary-light', theme.lightHex);
  root.style.setProperty('--theme-primary-text', theme.primaryHex);
}
