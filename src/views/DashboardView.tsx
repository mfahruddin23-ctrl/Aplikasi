import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateIndo, formatNumber } from '../utils/formatter';
import { Transaction } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Users,
  Truck,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  ArrowUpRight,
  Package,
  Layers,
  Sparkles,
  BarChart2,
  Calendar,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const {
    transactions,
    materials,
    customers,
    suppliers,
    settings,
  } = useApp();

  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  // Today's date string prefix (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's transactions
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(todayStr));
  }, [transactions, todayStr]);

  // Total sales today (omset)
  const todaySales = useMemo(() => {
    return todayTransactions.reduce((sum, t) => sum + t.grandTotal, 0);
  }, [todayTransactions]);

  // Total sales all time
  const totalSalesAll = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.grandTotal, 0);
  }, [transactions]);

  // Total inventory valuation
  const inventoryValuation = useMemo(() => {
    return materials.reduce((sum, m) => sum + m.stock * m.buyPrice, 0);
  }, [materials]);

  // Low stock materials (< minStock)
  const lowStockItems = useMemo(() => {
    return materials.filter((m) => m.stock <= m.minStock);
  }, [materials]);

  // Total Customer Receivables (Piutang toko)
  const totalCustomerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentDebt, 0);
  }, [customers]);

  // Total Supplier Debt (Hutang toko ke supplier)
  const totalSupplierDebt = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + s.currentDebtToSupplier, 0);
  }, [suppliers]);

  // Top 5 Best Selling Materials (calculated by sum of baseQty across all transactions)
  const topSellingMaterials = useMemo(() => {
    const salesMap: Record<string, { id: string; name: string; unit: string; totalQty: number; revenue: number }> = {};

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!salesMap[item.materialId]) {
          salesMap[item.materialId] = {
            id: item.materialId,
            name: item.name,
            unit: item.unit,
            totalQty: 0,
            revenue: 0,
          };
        }
        salesMap[item.materialId].totalQty += item.qty;
        salesMap[item.materialId].revenue += item.subtotal;
      });
    });

    return Object.values(salesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [transactions]);

  // 7 Days sales trend
  const last7DaysTrend = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);

      const dayTotal = transactions
        .filter((t) => t.date.startsWith(dateKey))
        .reduce((sum, t) => sum + t.grandTotal, 0);

      result.push({ dateKey, dayName, total: dayTotal });
    }
    return result;
  }, [transactions]);

  const maxTrend = Math.max(...last7DaysTrend.map((d) => d.total), 1000000);

  // Payment method distribution
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { Tunai: 0, Transfer: 0, QRIS: 0, Hutang: 0 };
    transactions.forEach((t) => {
      if (map[t.paymentMethod] !== undefined) {
        map[t.paymentMethod] += t.grandTotal;
      }
    });
    return map;
  }, [transactions]);

  return (
    <div id="dashboard-view-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-emerald-800 to-slate-900 p-6 rounded-3xl text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
              Panel Pengendalian Toko Bangunan
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{settings.storeName}</h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
            Pantau arus kas penjualan material harian, stok gudang menipis, pencatatan hutang piutang kontraktor, dan laba rugi dalam satu dashboard.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-dash-new-pos"
            type="button"
            onClick={() => onNavigateTab('pos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/30 transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir POS</span>
          </button>
          <button
            id="btn-dash-add-material"
            type="button"
            onClick={() => onNavigateTab('materials')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>Tambah Barang</span>
          </button>
          <button
            id="btn-dash-supplier-po"
            type="button"
            onClick={() => onNavigateTab('suppliers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
          >
            <Truck className="w-4 h-4 text-emerald-300" />
            <span>Faktur Masuk</span>
          </button>
        </div>
      </div>

      {/* Primary Key Metric Cards (Required by Prompt) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Penjualan Hari Ini */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Penjualan Hari Ini</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-2xl font-black text-slate-900 block">
              {formatRupiah(todaySales)}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold">
              {todayTransactions.length} transaksi nota hari ini
            </span>
          </div>
        </div>

        {/* Card 2: Total Pendapatan / Omset Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Omset Penjualan</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-2xl font-black text-slate-900 block">
              {formatRupiah(totalSalesAll)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Dari total {transactions.length} transaksi
            </span>
          </div>
        </div>

        {/* Card 3: Total Piutang Pelanggan */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Piutang Pelanggan</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-2xl font-black text-rose-600 block">
              {formatRupiah(totalCustomerDebt)}
            </span>
            <span className="text-[11px] text-rose-500 font-medium">
              Hutang kontraktor & proyek
            </span>
          </div>
        </div>

        {/* Card 4: Total Hutang ke Supplier */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hutang Toko ke Supplier</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg sm:text-2xl font-black text-amber-600 block">
              {formatRupiah(totalSupplierDebt)}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">
              Faktur semen/besi tempo
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Total SKU & Menipis & Aset */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total Material (SKU)</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{materials.length} Barang</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Stok Menipis / Kritis</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{lowStockItems.length} Material</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Estimasi Valuasi Aset Stok</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{formatRupiah(inventoryValuation)}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Section: Charts (7 Days Trend & Payment Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: 7-Days Revenue Trend Bar Visualizer */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">Grafik Penjualan 7 Hari Terakhir</h3>
            </div>
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" /> 7 Hari Berjalan
            </span>
          </div>

          <div className="pt-2">
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {last7DaysTrend.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.total / maxTrend) * 100));
                const isToday = item.dateKey === todayStr;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap shadow-sm">
                      {formatRupiah(item.total)}
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg overflow-hidden h-36 flex items-end justify-center p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 ${
                          isToday
                            ? 'bg-emerald-600 group-hover:bg-emerald-500'
                            : 'bg-slate-400 group-hover:bg-slate-600'
                        }`}
                      />
                    </div>

                    <span
                      className={`text-[11px] font-semibold ${
                        isToday ? 'text-emerald-700 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 cols: Payment Method Breakdown */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">Distribusi Metode Bayar</h3>
            <p className="text-xs text-slate-400">Komposisi penerimaan kas toko</p>
          </div>

          <div className="space-y-3">
            {Object.entries(paymentBreakdown).map(([method, val]) => {
              const amount = Number(val);
              const pct = totalSalesAll > 0 ? Math.round((amount / totalSalesAll) * 100) : 0;
              const getColor = (m: string) => {
                switch (m) {
                  case 'Tunai':
                    return 'bg-emerald-500';
                  case 'Transfer':
                    return 'bg-blue-500';
                  case 'QRIS':
                    return 'bg-violet-500';
                  default:
                    return 'bg-rose-500';
                }
              };

              return (
                <div key={method} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">{method}</span>
                    <span className="text-slate-900 font-bold">
                      {formatRupiah(amount)}{' '}
                      <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${getColor(method)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
            <p>
              💡 Catatan: Transaksi metode <strong>Hutang</strong> otomatis tercatat pada daftar Piutang Pelanggan dan dapat dilunasi secara bertahap (cicilan).
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Split: Top Selling Materials & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Materials Table (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">Produk Material Terlaris</h3>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              Top 5 Volume
            </span>
          </div>

          <div className="space-y-3">
            {topSellingMaterials.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/80 transition-colors text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Terjual: <strong className="text-slate-700">{item.totalQty} {item.unit}</strong>
                    </p>
                  </div>
                </div>
                <span className="font-bold text-slate-900 shrink-0">
                  {formatRupiah(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Warning Table (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">Peringatan Material Menipis</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('suppliers')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>Buat Order Supplier</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Semua persediaan material dalam kondisi aman di atas batas minimum.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
              {lowStockItems.map((mat) => (
                <div
                  key={mat.id}
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 px-2 rounded-lg"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{mat.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Lokasi: {mat.location} | Kategori: {mat.category}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Sisa: {formatNumber(mat.stock)} / Min {mat.minStock} {mat.baseUnit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions List with Reprint */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Riwayat Transaksi Terkini</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Lihat Semua Laporan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">No. Nota</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">Metode</th>
                <th className="py-2.5 px-3 text-right">Total Transaksi</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 6).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{tx.invoiceNo}</td>
                  <td className="py-2.5 px-3 text-slate-500">{formatDateIndo(tx.date)}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{tx.customerName}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(tx.grandTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tx.debtStatus === 'Lunas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.debtStatus || 'Lunas'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedTxForReceipt(tx)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold text-[11px] border border-slate-200 transition-colors inline-flex items-center gap-1"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>Cetak Nota</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Reprint Receipt */}
      {selectedTxForReceipt && (
        <ReceiptModal
          transaction={selectedTxForReceipt}
          settings={settings}
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}
    </div>
  );
};
