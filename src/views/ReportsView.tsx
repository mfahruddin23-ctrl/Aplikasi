import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateIndo, formatNumber } from '../utils/formatter';
import { Transaction, PurchaseInvoice, MaterialItem } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import { PurchaseInvoiceModal } from '../components/PurchaseInvoiceModal';
import { PrintReportModal } from '../components/PrintReportModal';
import {
  exportReportToExcel,
  exportReportToPDF,
  exportSalesInvoiceToPDF,
  exportSalesInvoiceToExcel,
  exportPurchaseInvoiceToPDF,
  exportPurchaseInvoiceToExcel,
} from '../utils/exportUtils';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  Search,
  CheckCircle,
  AlertTriangle,
  ShoppingBag,
  Truck,
  Boxes,
  Layers,
  ArrowUpDown,
  FileText,
  Filter,
} from 'lucide-react';

type ReportTab = 'sales' | 'purchases' | 'stock';

export const ReportsView: React.FC = () => {
  const { transactions, purchases, materials, settings, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [selectedPoForModal, setSelectedPoForModal] = useState<PurchaseInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Period label
  const periodLabel = useMemo(() => {
    switch (dateRangeFilter) {
      case 'today':
        return `Hari Ini (${formatDateIndo(new Date().toISOString())})`;
      case 'week':
        return '7 Hari Terakhir';
      case 'month':
        return '30 Hari Terakhir';
      case 'all':
      default:
        return 'Semua Data Terdaftar';
    }
  }, [dateRangeFilter]);

  // ========================================================
  // 1. SALES REPORT DATA & FILTERING
  // ========================================================
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      // Date filter
      const txDate = new Date(t.date);
      let matchesDate = true;
      if (dateRangeFilter === 'today') {
        matchesDate = t.date.startsWith(now.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = txDate >= weekAgo;
      } else if (dateRangeFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        matchesDate = txDate >= monthAgo;
      }

      // Search filter
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDate && matchesSearch;
    });
  }, [transactions, dateRangeFilter, searchQuery]);

  // Sales totals
  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.grandTotal, 0);
  }, [filteredTransactions]);

  const totalSalesHPP = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
      const lineHpp = t.items.reduce((itemSum, item) => itemSum + item.qty * item.buyPrice, 0);
      return sum + lineHpp;
    }, 0);
  }, [filteredTransactions]);

  const grossProfit = useMemo(() => totalRevenue - totalSalesHPP, [totalRevenue, totalSalesHPP]);

  const profitMarginPercent = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return Math.round((grossProfit / totalRevenue) * 100);
  }, [grossProfit, totalRevenue]);

  // ========================================================
  // 2. PURCHASES REPORT DATA & FILTERING
  // ========================================================
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter((po) => {
      const poDate = new Date(po.date);
      let matchesDate = true;
      if (dateRangeFilter === 'today') {
        matchesDate = po.date.startsWith(now.toISOString().split('T')[0]);
      } else if (dateRangeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = poDate >= weekAgo;
      } else if (dateRangeFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        matchesDate = poDate >= monthAgo;
      }

      const matchesSearch =
        searchQuery.trim() === '' ||
        po.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.items.some((i) => i.materialName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDate && matchesSearch;
    });
  }, [purchases, dateRangeFilter, searchQuery]);

  const totalPurchaseAmount = useMemo(() => {
    return filteredPurchases.reduce((sum, po) => sum + po.totalAmount, 0);
  }, [filteredPurchases]);

  const totalPurchasePaid = useMemo(() => {
    return filteredPurchases.reduce((sum, po) => sum + po.amountPaid, 0);
  }, [filteredPurchases]);

  const totalPurchaseDebt = useMemo(() => {
    return filteredPurchases.reduce((sum, po) => sum + (po.debtRemaining || 0), 0);
  }, [filteredPurchases]);

  // ========================================================
  // 3. STOCK & INVENTORY VALUATION DATA & FILTERING
  // ========================================================
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [materials, searchQuery]);

  // Inventory valuation
  const totalStockAssetValue = useMemo(() => {
    return filteredMaterials.reduce((sum, m) => sum + m.stock * m.buyPrice, 0);
  }, [filteredMaterials]);

  const totalStockPotentialRevenue = useMemo(() => {
    return filteredMaterials.reduce((sum, m) => sum + m.stock * m.sellPrice, 0);
  }, [filteredMaterials]);

  const lowStockCount = useMemo(() => {
    return filteredMaterials.filter((m) => m.stock <= m.minStock).length;
  }, [filteredMaterials]);

  // ========================================================
  // EXPORT HANDLERS (EXCEL & PDF WITH COMPANY HEADER)
  // ========================================================

  // 1. Export Sales
  const handleExportSalesExcel = () => {
    exportReportToExcel({
      fileName: `Laporan_Penjualan_${settings.storeName.replace(/\s+/g, '_')}_${dateRangeFilter}`,
      sheetName: 'Penjualan',
      reportTitle: 'LAPORAN TRANSAKSI PENJUALAN MATERIAL & LABA KOTOR',
      dateRangeText: periodLabel,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'No. Faktur', key: 'invoiceNo' },
        { header: 'Tanggal', key: 'date' },
        { header: 'Pelanggan', key: 'customerName' },
        { header: 'Kasir', key: 'cashierName' },
        { header: 'Metode', key: 'paymentMethod' },
        { header: 'Omset / Total (Rp)', key: 'grandTotal' },
        { header: 'Modal HPP (Rp)', key: 'hpp' },
        { header: 'Laba Kotor (Rp)', key: 'laba' },
        { header: 'Status Hutang', key: 'debtStatus' },
      ],
      data: filteredTransactions.map((t) => {
        const hpp = t.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
        return {
          invoiceNo: t.invoiceNo,
          date: formatDateIndo(t.date),
          customerName: t.customerName,
          cashierName: t.cashierName,
          paymentMethod: t.paymentMethod,
          grandTotal: t.grandTotal,
          hpp,
          laba: t.grandTotal - hpp,
          debtStatus: t.debtStatus || 'Lunas',
        };
      }),
      summaryRows: [
        { label: 'TOTAL OMSET PENJUALAN', value: totalRevenue },
        { label: 'TOTAL MODAL BARANG (HPP)', value: totalSalesHPP },
        { label: 'ESTIMASI LABA KOTOR', value: grossProfit },
        { label: 'MARGIN RATA-RATA KEUNTUNGAN', value: `${profitMarginPercent}%` },
      ],
    });
  };

  const handleExportSalesPDF = () => {
    exportReportToPDF({
      fileName: `Laporan_Penjualan_${settings.storeName.replace(/\s+/g, '_')}_${dateRangeFilter}`,
      reportTitle: 'LAPORAN TRANSAKSI PENJUALAN MATERIAL & LABA KOTOR',
      dateRangeText: periodLabel,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'No. Faktur', dataKey: 'invoiceNo' },
        { header: 'Tanggal', dataKey: 'date' },
        { header: 'Pelanggan', dataKey: 'customerName' },
        { header: 'Kasir', dataKey: 'cashierName' },
        { header: 'Metode', dataKey: 'paymentMethod' },
        { header: 'Omset (Rp)', dataKey: 'grandTotal' },
        { header: 'HPP Modal (Rp)', dataKey: 'hpp' },
        { header: 'Laba Kotor (Rp)', dataKey: 'laba' },
        { header: 'Status', dataKey: 'debtStatus' },
      ],
      data: filteredTransactions.map((t) => {
        const hpp = t.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
        return {
          invoiceNo: t.invoiceNo,
          date: formatDateIndo(t.date),
          customerName: t.customerName,
          cashierName: t.cashierName,
          paymentMethod: t.paymentMethod,
          grandTotal: formatRupiah(t.grandTotal),
          hpp: formatRupiah(hpp),
          laba: formatRupiah(t.grandTotal - hpp),
          debtStatus: t.debtStatus || 'Lunas',
        };
      }),
      summaryNotes: [
        `Total Omset Penjualan: ${formatRupiah(totalRevenue)} (dari ${filteredTransactions.length} transaksi nota)`,
        `Total Modal HPP Material: ${formatRupiah(totalSalesHPP)}`,
        `Estimasi Laba Kotor: ${formatRupiah(grossProfit)} (Margin Rata-rata: ${profitMarginPercent}%)`,
      ],
    });
  };

  // 2. Export Purchases
  const handleExportPurchasesExcel = () => {
    exportReportToExcel({
      fileName: `Laporan_Pembelian_${settings.storeName.replace(/\s+/g, '_')}_${dateRangeFilter}`,
      sheetName: 'Pembelian',
      reportTitle: 'LAPORAN PEMBELIAN BARANG MASUK DARI SUPPLIER / DISTRIBUTOR',
      dateRangeText: periodLabel,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'No. Faktur Sistem', key: 'invoiceNo' },
        { header: 'No. Faktur Supplier', key: 'supplierInvoiceNo' },
        { header: 'Tanggal Masuk', key: 'date' },
        { header: 'Supplier / Distributor', key: 'supplierName' },
        { header: 'Item Diterima', key: 'itemsCount' },
        { header: 'Total Pembelian (Rp)', key: 'totalAmount' },
        { header: 'Terbayar (Rp)', key: 'amountPaid' },
        { header: 'Sisa Hutang (Rp)', key: 'debtRemaining' },
        { header: 'Status Bayar', key: 'paymentStatus' },
      ],
      data: filteredPurchases.map((po) => ({
        invoiceNo: po.invoiceNo,
        supplierInvoiceNo: po.supplierInvoiceNo || '-',
        date: formatDateIndo(po.date),
        supplierName: po.supplierName,
        itemsCount: po.items.length,
        totalAmount: po.totalAmount,
        amountPaid: po.amountPaid,
        debtRemaining: po.debtRemaining,
        paymentStatus: po.paymentStatus,
      })),
      summaryRows: [
        { label: 'TOTAL NILAI PEMBELIAN', value: totalPurchaseAmount },
        { label: 'TOTAL PEMBAYARAN LUNAS', value: totalPurchasePaid },
        { label: 'TOTAL SISA HUTANG KE SUPPLIER', value: totalPurchaseDebt },
      ],
    });
  };

  const handleExportPurchasesPDF = () => {
    exportReportToPDF({
      fileName: `Laporan_Pembelian_${settings.storeName.replace(/\s+/g, '_')}_${dateRangeFilter}`,
      reportTitle: 'LAPORAN PEMBELIAN BARANG MASUK DARI SUPPLIER / DISTRIBUTOR',
      dateRangeText: periodLabel,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'No. Faktur', dataKey: 'invoiceNo' },
        { header: 'No. Supplier', dataKey: 'supplierInvoiceNo' },
        { header: 'Tanggal', dataKey: 'date' },
        { header: 'Supplier / Pabrik', dataKey: 'supplierName' },
        { header: 'Item', dataKey: 'itemsCount' },
        { header: 'Total Beli (Rp)', dataKey: 'totalAmount' },
        { header: 'Terbayar (Rp)', dataKey: 'amountPaid' },
        { header: 'Sisa Hutang (Rp)', dataKey: 'debtRemaining' },
        { header: 'Status', dataKey: 'paymentStatus' },
      ],
      data: filteredPurchases.map((po) => ({
        invoiceNo: po.invoiceNo,
        supplierInvoiceNo: po.supplierInvoiceNo || '-',
        date: formatDateIndo(po.date),
        supplierName: po.supplierName,
        itemsCount: po.items.length,
        totalAmount: formatRupiah(po.totalAmount),
        amountPaid: formatRupiah(po.amountPaid),
        debtRemaining: formatRupiah(po.debtRemaining),
        paymentStatus: po.paymentStatus,
      })),
      summaryNotes: [
        `Total Nilai Pembelian Barang Masuk: ${formatRupiah(totalPurchaseAmount)}`,
        `Total Pembayaran Terbayar: ${formatRupiah(totalPurchasePaid)}`,
        `Total Sisa Hutang Dagang ke Supplier: ${formatRupiah(totalPurchaseDebt)}`,
      ],
    });
  };

  // 3. Export Stock
  const handleExportStockExcel = () => {
    exportReportToExcel({
      fileName: `Laporan_Stok_Material_${settings.storeName.replace(/\s+/g, '_')}`,
      sheetName: 'Stok Material',
      reportTitle: 'LAPORAN STOK & VALUASI INVENTARIS MATERIAL BANGUNAN',
      dateRangeText: `Posisi Per ${formatDateIndo(new Date().toISOString())}`,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'Kode Barang', key: 'code' },
        { header: 'Barcode', key: 'barcode' },
        { header: 'Nama Material', key: 'name' },
        { header: 'Kategori', key: 'category' },
        { header: 'Satuan', key: 'baseUnit' },
        { header: 'Stok Gudang', key: 'stock' },
        { header: 'Min Stok', key: 'minStock' },
        { header: 'Harga Beli HPP (Rp)', key: 'buyPrice' },
        { header: 'Harga Jual Eceran (Rp)', key: 'sellPrice' },
        { header: 'Nilai Aset Modal (Rp)', key: 'assetValue' },
        { header: 'Potensi Omset (Rp)', key: 'potentialRevenue' },
        { header: 'Lokasi Rak', key: 'location' },
      ],
      data: filteredMaterials.map((m) => ({
        code: m.code,
        barcode: m.barcode || '-',
        name: m.name,
        category: m.category,
        baseUnit: m.baseUnit,
        stock: m.stock,
        minStock: m.minStock,
        buyPrice: m.buyPrice,
        sellPrice: m.sellPrice,
        assetValue: m.stock * m.buyPrice,
        potentialRevenue: m.stock * m.sellPrice,
        location: m.location,
      })),
      summaryRows: [
        { label: 'TOTAL VALUASI ASET STOK (HPP MODAL)', value: totalStockAssetValue },
        { label: 'TOTAL POTENSI NILAI JUAL OMSET', value: totalStockPotentialRevenue },
        { label: 'JUMLAH JENIS BARANG MATERIAL', value: filteredMaterials.length },
      ],
    });
  };

  const handleExportStockPDF = () => {
    exportReportToPDF({
      fileName: `Laporan_Stok_Material_${settings.storeName.replace(/\s+/g, '_')}`,
      reportTitle: 'LAPORAN STOK & VALUASI INVENTARIS MATERIAL BANGUNAN',
      dateRangeText: `Posisi Stok Per ${formatDateIndo(new Date().toISOString())}`,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'Kode', dataKey: 'code' },
        { header: 'Nama Material', dataKey: 'name' },
        { header: 'Kategori', dataKey: 'category' },
        { header: 'Stok', dataKey: 'stock' },
        { header: 'Harga Beli HPP', dataKey: 'buyPrice' },
        { header: 'Harga Jual', dataKey: 'sellPrice' },
        { header: 'Nilai Aset Modal', dataKey: 'assetValue' },
        { header: 'Status', dataKey: 'status' },
      ],
      data: filteredMaterials.map((m) => {
        const isLow = m.stock <= m.minStock;
        const isOut = m.stock === 0;
        const status = isOut ? 'HABIS' : isLow ? 'MENIPIS' : 'AMAN';
        return {
          code: m.code,
          name: m.name,
          category: m.category,
          stock: `${m.stock} ${m.baseUnit}`,
          buyPrice: formatRupiah(m.buyPrice),
          sellPrice: formatRupiah(m.sellPrice),
          assetValue: formatRupiah(m.stock * m.buyPrice),
          status,
        };
      }),
      summaryNotes: [
        `Total Valuasi Aset Stok Modal (HPP): ${formatRupiah(totalStockAssetValue)}`,
        `Total Potensi Nilai Jual Omset: ${formatRupiah(totalStockPotentialRevenue)}`,
        `Total Jenis Material: ${filteredMaterials.length} item (${lowStockCount} material stok menipis/kritis)`,
      ],
    });
  };

  // Determine current active print data for PrintReportModal
  const currentPrintModalData = useMemo(() => {
    if (activeTab === 'sales') {
      return {
        title: 'LAPORAN TRANSAKSI PENJUALAN MATERIAL & LABA KOTOR',
        columns: [
          { header: 'No. Faktur', align: 'left' as const },
          { header: 'Tanggal', align: 'left' as const },
          { header: 'Pelanggan', align: 'left' as const },
          { header: 'Kasir', align: 'left' as const },
          { header: 'Metode', align: 'center' as const },
          { header: 'Omset (Rp)', align: 'right' as const },
          { header: 'Modal HPP (Rp)', align: 'right' as const },
          { header: 'Laba Kotor (Rp)', align: 'right' as const },
          { header: 'Status', align: 'center' as const },
        ],
        rows: filteredTransactions.map((t) => {
          const hpp = t.items.reduce((sum, i) => sum + i.qty * i.buyPrice, 0);
          return [
            t.invoiceNo,
            formatDateIndo(t.date),
            t.customerName,
            t.cashierName,
            t.paymentMethod,
            formatRupiah(t.grandTotal),
            formatRupiah(hpp),
            formatRupiah(t.grandTotal - hpp),
            t.debtStatus || 'Lunas',
          ];
        }),
        summaryCards: [
          { label: 'Total Omset', value: formatRupiah(totalRevenue) },
          { label: 'Total Modal HPP', value: formatRupiah(totalSalesHPP) },
          { label: 'Laba Kotor', value: formatRupiah(grossProfit) },
          { label: 'Margin Laba', value: `${profitMarginPercent}%` },
        ],
      };
    } else if (activeTab === 'purchases') {
      return {
        title: 'LAPORAN PEMBELIAN & BARANG MASUK DISTRIBUTOR',
        columns: [
          { header: 'No. Faktur', align: 'left' as const },
          { header: 'No. Supplier', align: 'left' as const },
          { header: 'Tanggal', align: 'left' as const },
          { header: 'Distributor / Pabrik', align: 'left' as const },
          { header: 'Item', align: 'center' as const },
          { header: 'Total Beli (Rp)', align: 'right' as const },
          { header: 'Terbayar (Rp)', align: 'right' as const },
          { header: 'Sisa Hutang (Rp)', align: 'right' as const },
          { header: 'Status', align: 'center' as const },
        ],
        rows: filteredPurchases.map((po) => [
          po.invoiceNo,
          po.supplierInvoiceNo || '-',
          formatDateIndo(po.date),
          po.supplierName,
          po.items.length,
          formatRupiah(po.totalAmount),
          formatRupiah(po.amountPaid),
          formatRupiah(po.debtRemaining),
          po.paymentStatus,
        ]),
        summaryCards: [
          { label: 'Total Pembelian', value: formatRupiah(totalPurchaseAmount) },
          { label: 'Sudah Dibayar', value: formatRupiah(totalPurchasePaid) },
          { label: 'Sisa Hutang Supplier', value: formatRupiah(totalPurchaseDebt) },
          { label: 'Jumlah Faktur', value: `${filteredPurchases.length} Faktur` },
        ],
      };
    } else {
      return {
        title: 'LAPORAN STOK & VALUASI INVENTARIS MATERIAL BANGUNAN',
        columns: [
          { header: 'Kode', align: 'left' as const },
          { header: 'Nama Material', align: 'left' as const },
          { header: 'Kategori', align: 'left' as const },
          { header: 'Stok Gudang', align: 'center' as const },
          { header: 'Harga Beli (HPP)', align: 'right' as const },
          { header: 'Harga Jual', align: 'right' as const },
          { header: 'Nilai Aset Modal', align: 'right' as const },
          { header: 'Status Stok', align: 'center' as const },
        ],
        rows: filteredMaterials.map((m) => {
          const isLow = m.stock <= m.minStock;
          const isOut = m.stock === 0;
          return [
            m.code,
            m.name,
            m.category,
            `${m.stock} ${m.baseUnit}`,
            formatRupiah(m.buyPrice),
            formatRupiah(m.sellPrice),
            formatRupiah(m.stock * m.buyPrice),
            isOut ? 'HABIS' : isLow ? 'MENIPIS' : 'AMAN',
          ];
        }),
        summaryCards: [
          { label: 'Valuasi Aset HPP', value: formatRupiah(totalStockAssetValue) },
          { label: 'Potensi Omset Jual', value: formatRupiah(totalStockPotentialRevenue) },
          { label: 'Total Item Barang', value: `${filteredMaterials.length} Jenis` },
          { label: 'Stok Menipis', value: `${lowStockCount} Item` },
        ],
      };
    }
  }, [
    activeTab,
    filteredTransactions,
    filteredPurchases,
    filteredMaterials,
    totalRevenue,
    totalSalesHPP,
    grossProfit,
    profitMarginPercent,
    totalPurchaseAmount,
    totalPurchasePaid,
    totalPurchaseDebt,
    totalStockAssetValue,
    totalStockPotentialRevenue,
    lowStockCount,
  ]);

  return (
    <div id="reports-view-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header with Company Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-mono">
              {settings.storeName}
            </span>
            <span className="text-xs text-slate-400">• Pusat Laporan & Dokumen Resmi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 mt-1">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Laporan Keuangan, Stok & Faktur Material
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cetak dan download laporan stok, penjualan, dan pembelian dalam format PDF & Excel (.xlsx) dengan kop nama perusahaan.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-print-active-report"
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition-all hover:shadow-lg"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Dokumen (Print / PDF)</span>
          </button>

          <button
            id="btn-download-excel-active"
            type="button"
            onClick={() => {
              if (activeTab === 'sales') handleExportSalesExcel();
              else if (activeTab === 'purchases') handleExportPurchasesExcel();
              else handleExportStockExcel();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>

          <button
            id="btn-download-pdf-active"
            type="button"
            onClick={() => {
              if (activeTab === 'sales') handleExportSalesPDF();
              else if (activeTab === 'purchases') handleExportPurchasesPDF();
              else handleExportStockPDF();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Main 3-Tab Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            id="tab-report-sales"
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Laporan Penjualan</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {filteredTransactions.length}
            </span>
          </button>

          <button
            id="tab-report-purchases"
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'purchases'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Laporan Pembelian</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {filteredPurchases.length}
            </span>
          </button>

          <button
            id="tab-report-stock"
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'stock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Laporan Stok Material</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {filteredMaterials.length}
            </span>
          </button>
        </div>

        {/* Date Filter & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== 'stock' && (
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <span className="text-slate-400 pl-2 text-[11px]">Periode:</span>
              <button
                type="button"
                onClick={() => setDateRangeFilter('today')}
                className={`px-2.5 py-1 rounded-md transition-colors text-[11px] ${
                  dateRangeFilter === 'today'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter('week')}
                className={`px-2.5 py-1 rounded-md transition-colors text-[11px] ${
                  dateRangeFilter === 'week'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter('month')}
                className={`px-2.5 py-1 rounded-md transition-colors text-[11px] ${
                  dateRangeFilter === 'month'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors text-[11px] ${
                  dateRangeFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nota, pelanggan, material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs w-48 sm:w-60 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB 1: LAPORAN PENJUALAN
      ========================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total Omset Penjualan</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-slate-900 block">
                {formatRupiah(totalRevenue)}
              </span>
              <span className="text-[11px] text-slate-400">
                Dari {filteredTransactions.length} nota transaksi ({periodLabel})
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total Modal Barang (HPP)</span>
                <ShoppingBag className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-slate-900 block">
                {formatRupiah(totalSalesHPP)}
              </span>
              <span className="text-[11px] text-slate-400">Harga beli ke pabrik/distributor</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Estimasi Laba Kotor</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-700 block">
                {formatRupiah(grossProfit)}
              </span>
              <span className="text-[11px] text-emerald-600 font-bold">
                Omset dikurangi modal HPP
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Margin Keuntungan</span>
                <Percent className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl font-black text-purple-700 block">
                {profitMarginPercent}%
              </span>
              <span className="text-[11px] text-purple-600 font-medium">Margin bruto material</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Daftar Transaksi Penjualan Material ({filteredTransactions.length} Nota)
                </h3>
                <p className="text-xs text-slate-500">
                  Header dokumen resmi toko: <strong className="text-slate-800">{settings.storeName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSalesExcel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSalesPDF}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold hover:bg-rose-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">No. Nota</th>
                    <th className="py-3 px-3">Waktu</th>
                    <th className="py-3 px-3">Pelanggan</th>
                    <th className="py-3 px-3">Kasir</th>
                    <th className="py-3 px-3">Item Terjual</th>
                    <th className="py-3 px-3">Metode</th>
                    <th className="py-3 px-3 text-right">Omset</th>
                    <th className="py-3 px-3 text-right">HPP Modal</th>
                    <th className="py-3 px-3 text-right">Laba Kotor</th>
                    <th className="py-3 px-3 text-center">Faktur & Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const txHpp = tx.items.reduce((s, i) => s + i.qty * i.buyPrice, 0);
                    const txLaba = tx.grandTotal - txHpp;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{tx.invoiceNo}</td>
                        <td className="py-3 px-3 text-slate-500">{formatDateIndo(tx.date)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{tx.customerName}</td>
                        <td className="py-3 px-3 text-slate-600">{tx.cashierName}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {tx.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              tx.paymentMethod === 'Hutang'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatRupiah(tx.grandTotal)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {formatRupiah(txHpp)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {formatRupiah(txLaba)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setSelectedTxForReceipt(tx)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                              title="Cetak Faktur / Struk & Download PDF"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => exportSalesInvoiceToPDF(tx, settings)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                              title="Download Faktur PDF Langsung"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => exportSalesInvoiceToExcel(tx, settings)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                              title="Download Faktur Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: LAPORAN PEMBELIAN
      ========================================================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total Nilai Pembelian Barang Masuk</span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-slate-900 block">
                {formatRupiah(totalPurchaseAmount)}
              </span>
              <span className="text-[11px] text-slate-400">
                Dari {filteredPurchases.length} faktur distributor ({periodLabel})
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total Pembelian Lunas</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-700 block">
                {formatRupiah(totalPurchasePaid)}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Pembayaran tunai / transfer</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Sisa Hutang Dagang ke Supplier</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-700 block">
                {formatRupiah(totalPurchaseDebt)}
              </span>
              <span className="text-[11px] text-rose-600 font-medium">Tagihan jatuh tempo distributor</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Daftar Faktur Pembelian Supplier ({filteredPurchases.length} Faktur)
                </h3>
                <p className="text-xs text-slate-500">
                  Header dokumen resmi: <strong className="text-slate-800">{settings.storeName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPurchasesExcel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPurchasesPDF}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold hover:bg-rose-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">No. Faktur Sistem</th>
                    <th className="py-3 px-3">No. Supplier</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Distributor / Pabrik</th>
                    <th className="py-3 px-3 text-center">Jumlah Item</th>
                    <th className="py-3 px-3 text-right">Total Tagihan</th>
                    <th className="py-3 px-3 text-right">Terbayar</th>
                    <th className="py-3 px-3 text-right">Sisa Hutang</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Cetak Faktur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{po.invoiceNo}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{po.supplierInvoiceNo || '-'}</td>
                      <td className="py-3 px-3 text-slate-500">{formatDateIndo(po.date)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{po.supplierName}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                          {po.items.length} item
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(po.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                        {formatRupiah(po.amountPaid)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700 font-semibold">
                        {formatRupiah(po.debtRemaining)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            po.paymentStatus === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {po.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPoForModal(po)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                            title="Cetak Faktur Pembelian"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => exportPurchaseInvoiceToPDF(po, settings)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                            title="Download PDF Faktur Pembelian"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => exportPurchaseInvoiceToExcel(po, settings)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Download Excel Faktur Pembelian"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: LAPORAN STOK & VALUASI INVENTARIS
      ========================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Valuasi Aset Stok (HPP Modal)</span>
                <Boxes className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-slate-900 block">
                {formatRupiah(totalStockAssetValue)}
              </span>
              <span className="text-[11px] text-slate-400">Total nilai modal barang di gudang</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Potensi Nilai Omset (Harga Jual)</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-blue-800 block">
                {formatRupiah(totalStockPotentialRevenue)}
              </span>
              <span className="text-[11px] text-slate-400">Jika seluruh stok saat ini terjual</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total Ragam Material</span>
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl font-black text-purple-800 block">
                {filteredMaterials.length}
              </span>
              <span className="text-[11px] text-slate-400">SKU barang aktif dalam database</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Stok Menipis / Kritis</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-700 block">{lowStockCount}</span>
              <span className="text-[11px] text-rose-600 font-semibold">Perlu pengadaan ke distributor</span>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Rincian Stok & Valuasi Material ({filteredMaterials.length} Material)
                </h3>
                <p className="text-xs text-slate-500">
                  Header dokumen resmi: <strong className="text-slate-800">{settings.storeName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportStockExcel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportStockPDF}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold hover:bg-rose-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">Kode</th>
                    <th className="py-3 px-3">Nama Material</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-center">Stok Saat Ini</th>
                    <th className="py-3 px-3 text-center">Min. Stok</th>
                    <th className="py-3 px-3 text-right">Harga Beli HPP</th>
                    <th className="py-3 px-3 text-right">Harga Jual</th>
                    <th className="py-3 px-3 text-right">Valuasi Aset Modal</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((m) => {
                    const isLow = m.stock <= m.minStock;
                    const isOut = m.stock === 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{m.code}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{m.name}</td>
                        <td className="py-3 px-3 text-slate-600">{m.category}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {m.stock} {m.baseUnit}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {m.minStock} {m.baseUnit}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {formatRupiah(m.buyPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatRupiah(m.sellPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {formatRupiah(m.stock * m.buyPrice)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOut
                                ? 'bg-red-100 text-red-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">{m.location}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Reprint Sales Receipt / Invoice */}
      {selectedTxForReceipt && (
        <ReceiptModal
          transaction={selectedTxForReceipt}
          settings={settings}
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}

      {/* Modal for Purchase Invoice */}
      {selectedPoForModal && (
        <PurchaseInvoiceModal
          purchase={selectedPoForModal}
          settings={settings}
          onClose={() => setSelectedPoForModal(null)}
        />
      )}

      {/* Printable Report Modal */}
      {isPrintModalOpen && (
        <PrintReportModal
          reportTitle={currentPrintModalData.title}
          periodText={periodLabel}
          settings={settings}
          operatorName={currentUser.name}
          columns={currentPrintModalData.columns}
          dataRows={currentPrintModalData.rows}
          summaryCards={currentPrintModalData.summaryCards}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
