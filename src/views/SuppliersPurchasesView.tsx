import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier, PurchaseInvoice, PurchaseItem, StandardUnit } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatter';
import { PurchaseInvoiceModal } from '../components/PurchaseInvoiceModal';
import {
  exportReportToExcel,
  exportReportToPDF,
  exportPurchaseInvoiceToPDF,
  exportPurchaseInvoiceToExcel,
} from '../utils/exportUtils';
import {
  Truck,
  Plus,
  Search,
  Receipt,
  CheckCircle,
  AlertCircle,
  Building2,
  Trash2,
  X,
  Phone,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
} from 'lucide-react';

export const SuppliersPurchasesView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    recordPurchase,
    recordSupplierDebtPayment,
    purchases,
    materials,
    currentUser,
    settings,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPurchaseForModal, setSelectedPurchaseForModal] = useState<PurchaseInvoice | null>(
    null
  );

  // Create Supplier Modal
  const [isAddSupOpen, setIsAddSupOpen] = useState<boolean>(false);
  const [supName, setSupName] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supContact, setSupContact] = useState<string>('');
  const [supBank, setSupBank] = useState<string>('');

  // Create Purchase Invoice Modal (Barang Masuk)
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState<boolean>(false);
  const [poSupplierId, setPoSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [poSupplierInvoiceNo, setPoSupplierInvoiceNo] = useState<string>('');
  const [poPaymentStatus, setPoPaymentStatus] = useState<'Lunas' | 'Hutang'>('Lunas');
  const [poAmountPaid, setPoAmountPaid] = useState<number>(0);
  const [poDueDate, setPoDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [poNotes, setPoNotes] = useState<string>('');

  // Items in new purchase invoice
  const [poItems, setPoItems] = useState<PurchaseItem[]>([
    {
      materialId: materials[0]?.id || '',
      materialName: materials[0]?.name || '',
      unit: materials[0]?.baseUnit || 'Sak',
      qty: 50,
      buyPrice: materials[0]?.buyPrice || 0,
      subtotal: (materials[0]?.buyPrice || 0) * 50,
    },
  ]);

  // Pay Supplier Debt Modal
  const [isPaySupplierOpen, setIsPaySupplierOpen] = useState<boolean>(false);
  const [payTargetSupplier, setPayTargetSupplier] = useState<Supplier | null>(null);
  const [payAmountToSupplier, setPayAmountToSupplier] = useState<number>(0);

  // Total debt to all suppliers
  const totalDebtToSuppliers = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + s.currentDebtToSupplier, 0);
  }, [suppliers]);

  // Calculate new purchase total
  const newPurchaseTotal = useMemo(() => {
    return poItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [poItems]);

  // Add Item row in purchase modal
  const handleAddPurchaseItemRow = () => {
    const m = materials[0];
    if (!m) return;
    setPoItems((prev) => [
      ...prev,
      {
        materialId: m.id,
        materialName: m.name,
        unit: m.baseUnit,
        qty: 10,
        buyPrice: m.buyPrice,
        subtotal: m.buyPrice * 10,
      },
    ]);
  };

  const handleUpdatePurchaseItem = (
    index: number,
    field: 'materialId' | 'qty' | 'buyPrice',
    value: any
  ) => {
    setPoItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'materialId') {
        const mat = materials.find((m) => m.id === value);
        if (mat) {
          item.materialId = mat.id;
          item.materialName = mat.name;
          item.unit = mat.baseUnit;
          item.buyPrice = mat.buyPrice;
          item.subtotal = mat.buyPrice * item.qty;
        }
      } else if (field === 'qty') {
        item.qty = Math.max(1, parseFloat(value) || 0);
        item.subtotal = item.qty * item.buyPrice;
      } else if (field === 'buyPrice') {
        item.buyPrice = Math.max(0, parseFloat(value) || 0);
        item.subtotal = item.qty * item.buyPrice;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemovePurchaseItem = (idx: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Purchase Invoice
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Pilih minimal 1 material barang!');
      return;
    }

    const supplier = suppliers.find((s) => s.id === poSupplierId);
    if (!supplier) return;

    const isHutang = poPaymentStatus === 'Hutang';
    const debtRemaining = isHutang ? Math.max(0, newPurchaseTotal - poAmountPaid) : 0;

    recordPurchase({
      supplierInvoiceNo: poSupplierInvoiceNo || `INV-SUP-${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: poItems,
      totalAmount: newPurchaseTotal,
      paymentStatus: isHutang && debtRemaining > 0 ? 'Hutang' : 'Lunas',
      amountPaid: isHutang ? poAmountPaid : newPurchaseTotal,
      debtRemaining,
      dueDate: isHutang ? poDueDate : undefined,
      cashierName: currentUser.name,
      notes: poNotes,
    });

    setIsNewPurchaseOpen(false);
    alert('Faktur pembelian berhasil dicatat! Stok barang otomatis bertambah.');
  };

  // Save new supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    addSupplier({
      name: supName,
      phone: supPhone,
      address: supAddress,
      contactPerson: supContact,
      bankInfo: supBank,
    });

    setIsAddSupOpen(false);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setSupContact('');
    setSupBank('');
  };

  // Pay Supplier debt
  const handleConfirmPaySupplier = () => {
    if (!payTargetSupplier || payAmountToSupplier <= 0) return;

    recordSupplierDebtPayment(payTargetSupplier.id, payAmountToSupplier);
    setIsPaySupplierOpen(false);
    alert(`Pembayaran hutang ke ${payTargetSupplier.name} berhasil dicatat.`);
  };

  return (
    <div id="suppliers-purchases-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            Supplier & Faktur Pembelian (Barang Masuk)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Catat faktur masuk material dari pabrik/distributor, tambah stok gudang secara otomatis, dan kelola hutang toko.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-purchases-excel"
            type="button"
            onClick={() => {
              exportReportToExcel({
                fileName: `Rekap_Pembelian_${settings.storeName.replace(/\s+/g, '_')}`,
                sheetName: 'Pembelian',
                reportTitle: 'REKAPITULASI FAKTUR PEMBELIAN BARANG MASUK',
                settings,
                operatorName: currentUser.name,
                columns: [
                  { header: 'No. Faktur Sistem', key: 'invoiceNo' },
                  { header: 'No. Surat Jalan', key: 'supplierInvoiceNo' },
                  { header: 'Tanggal', key: 'date' },
                  { header: 'Supplier / Distributor', key: 'supplierName' },
                  { header: 'Item Diterima', key: 'items' },
                  { header: 'Total Nilai (Rp)', key: 'totalAmount' },
                  { header: 'Terbayar (Rp)', key: 'amountPaid' },
                  { header: 'Sisa Hutang (Rp)', key: 'debtRemaining' },
                  { header: 'Status', key: 'paymentStatus' },
                ],
                data: purchases.map((po) => ({
                  invoiceNo: po.invoiceNo,
                  supplierInvoiceNo: po.supplierInvoiceNo || '-',
                  date: formatDateIndo(po.date),
                  supplierName: po.supplierName,
                  items: po.items.map((i) => `${i.qty} ${i.unit} ${i.materialName}`).join('; '),
                  totalAmount: po.totalAmount,
                  amountPaid: po.amountPaid,
                  debtRemaining: po.debtRemaining,
                  paymentStatus: po.paymentStatus,
                })),
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            id="btn-export-purchases-pdf"
            type="button"
            onClick={() => {
              exportReportToPDF({
                fileName: `Rekap_Pembelian_${settings.storeName.replace(/\s+/g, '_')}`,
                reportTitle: 'REKAPITULASI FAKTUR PEMBELIAN BARANG MASUK',
                settings,
                operatorName: currentUser.name,
                columns: [
                  { header: 'No. Faktur', dataKey: 'invoiceNo' },
                  { header: 'No. Supplier', dataKey: 'supplierInvoiceNo' },
                  { header: 'Tanggal', dataKey: 'date' },
                  { header: 'Supplier', dataKey: 'supplierName' },
                  { header: 'Total Beli', dataKey: 'totalAmount' },
                  { header: 'Sisa Hutang', dataKey: 'debtRemaining' },
                  { header: 'Status', dataKey: 'paymentStatus' },
                ],
                data: purchases.map((po) => ({
                  invoiceNo: po.invoiceNo,
                  supplierInvoiceNo: po.supplierInvoiceNo || '-',
                  date: formatDateIndo(po.date),
                  supplierName: po.supplierName,
                  totalAmount: formatRupiah(po.totalAmount),
                  debtRemaining: formatRupiah(po.debtRemaining),
                  paymentStatus: po.paymentStatus,
                })),
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-300"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>PDF (.pdf)</span>
          </button>

          <button
            id="btn-add-supplier"
            type="button"
            onClick={() => setIsAddSupOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300"
          >
            <Building2 className="w-4 h-4" />
            <span>Supplier Baru</span>
          </button>
          <button
            id="btn-new-purchase-invoice"
            type="button"
            onClick={() => {
              setPoSupplierId(suppliers[0]?.id || '');
              setIsNewPurchaseOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Input Faktur Masuk (PO)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total Hutang Toko ke Supplier</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {formatRupiah(totalDebtToSuppliers)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Jumlah Mitra Supplier Pabrik</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{suppliers.length} Supplier</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total Faktur Pembelian Masuk</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{purchases.length} Faktur</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-3 border-b-2 transition-colors ${
            activeTab === 'purchases'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Riwayat Faktur Masuk (Barang Masuk)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-3 border-b-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Supplier & Saldo Hutang
        </button>
      </div>

      {/* TAB 1: PURCHASES INVOICE TABLE */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">No. Faktur Sistem</th>
                  <th className="py-3 px-3">No. Surat Jalan Supplier</th>
                  <th className="py-3 px-3">Nama Supplier</th>
                  <th className="py-3 px-3">Tanggal Masuk</th>
                  <th className="py-3 px-3">Rincian Material</th>
                  <th className="py-3 px-3 text-right">Nilai Faktur</th>
                  <th className="py-3 px-3 text-right">Sisa Hutang</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Cetak & Unduh Faktur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{po.invoiceNo}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{po.supplierInvoiceNo}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{po.supplierName}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDateIndo(po.date)}</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {po.items.map((i) => `${i.qty} ${i.unit} ${i.materialName}`).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(po.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      {formatRupiah(po.debtRemaining)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          po.paymentStatus === 'Lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPurchaseForModal(po)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200"
                          title="Lihat & Cetak Faktur Masuk"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cetak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPurchaseInvoiceToPDF(po, settings)}
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                          title="Unduh Faktur PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPurchaseInvoiceToExcel(po, settings)}
                          className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                          title="Unduh Faktur Excel (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS LIST TABLE */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Nama Perusahaan / Supplier</th>
                  <th className="py-3 px-3">Kontak Person & Telepon</th>
                  <th className="py-3 px-3">Alamat</th>
                  <th className="py-3 px-3">Rekening Pembayaran</th>
                  <th className="py-3 px-3 text-right">Saldo Hutang Toko</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <p className="font-semibold text-slate-800">{s.contactPerson}</p>
                      <p className="text-[11px] text-slate-500">{s.phone}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{s.address}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {s.bankInfo || '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black text-sm ${
                          s.currentDebtToSupplier > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {formatRupiah(s.currentDebtToSupplier)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.currentDebtToSupplier > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPayTargetSupplier(s);
                            setPayAmountToSupplier(s.currentDebtToSupplier);
                            setIsPaySupplierOpen(true);
                          }}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-300 text-[11px]"
                        >
                          Bayar Hutang
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-semibold">Lunas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INPUT FAKTUR MASUK (NEW PURCHASE) MODAL */}
      {isNewPurchaseOpen && (
        <div
          id="new-purchase-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Input Faktur Pembelian (Penerimaan Barang Supplier)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPurchaseOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Supplier & Invoice metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Pilih Supplier:</label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">No. Faktur / Surat Jalan Supplier:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026/09/01"
                    value={poSupplierInvoiceNo}
                    onChange={(e) => setPoSupplierInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Status Pembayaran:</label>
                  <select
                    value={poPaymentStatus}
                    onChange={(e) => setPoPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="Lunas">Lunas Langsung</option>
                    <option value="Hutang">Tempo / Hutang Dagang</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Daftar Material yang Diterima:</span>
                  <button
                    type="button"
                    onClick={handleAddPurchaseItemRow}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 items-center"
                    >
                      <div className="col-span-5">
                        <label className="text-[10px] text-slate-400 block">Pilih Material:</label>
                        <select
                          value={item.materialId}
                          onChange={(e) => handleUpdatePurchaseItem(idx, 'materialId', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-semibold bg-white"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              [{m.code}] {m.name} ({m.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block">
                          Qty ({item.unit}):
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleUpdatePurchaseItem(idx, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-bold text-center bg-white"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block">Harga Beli/Satuan:</label>
                        <input
                          type="number"
                          value={item.buyPrice}
                          onChange={(e) => handleUpdatePurchaseItem(idx, 'buyPrice', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div className="col-span-2 text-right pt-3 flex items-center justify-end gap-1">
                        <span className="font-bold text-slate-800 text-[11px]">
                          {formatRupiah(item.subtotal)}
                        </span>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePurchaseItem(idx)}
                            className="text-slate-300 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals and Debt Details */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-700">Total Nilai Faktur:</span>
                <span className="text-emerald-800 text-base">{formatRupiah(newPurchaseTotal)}</span>
              </div>

              {poPaymentStatus === 'Hutang' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Uang Muka / Dibayar:</label>
                    <input
                      type="number"
                      value={poAmountPaid || ''}
                      onChange={(e) => setPoAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white"
                      placeholder="Rp 0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Jatuh Tempo Faktur:</label>
                    <input
                      type="date"
                      value={poDueDate}
                      onChange={(e) => setPoDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Catatan Faktur (Opsional):</label>
                <input
                  type="text"
                  placeholder="Catatan supir pengirim, nomor polisi truk tronton, dll."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Simpan & Update Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      {isAddSupOpen && (
        <div
          id="add-supplier-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Tambah Supplier Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddSupOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Perusahaan / Supplier:</label>
                <input
                  type="text"
                  required
                  placeholder="PT / CV / Toko Agen Distributor..."
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Sales / Kontak Person:</label>
                <input
                  type="text"
                  placeholder="Bapak / Ibu Sales"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nomor Telepon / WA Kantor:</label>
                <input
                  type="text"
                  placeholder="021-xxxx / 0812-xxxx"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Alamat Gudang / Kantor:</label>
                <textarea
                  rows={2}
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Info Rekening Bank Pembayaran:</label>
                <input
                  type="text"
                  placeholder="Contoh: BCA 123-456 a/n PT Semen Indonesia"
                  value={supBank}
                  onChange={(e) => setSupBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY SUPPLIER DEBT MODAL */}
      {isPaySupplierOpen && payTargetSupplier && (
        <div
          id="pay-supplier-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Pelunasan Hutang Supplier</h3>
                <p className="text-xs text-slate-500">{payTargetSupplier.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaySupplierOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-amber-800">Total Hutang Toko:</span>
                <span className="font-black text-base text-amber-700">
                  {formatRupiah(payTargetSupplier.currentDebtToSupplier)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nominal yang Dibayar (Rp):</label>
                <input
                  type="number"
                  value={payAmountToSupplier || ''}
                  onChange={(e) => setPayAmountToSupplier(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-base font-bold text-slate-900"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                <p className="font-semibold">Rekening Supplier:</p>
                <p className="font-mono">{payTargetSupplier.bankInfo || 'Tidak tercatat'}</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPaySupplierOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPaySupplier}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Konfirmasi Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Print Purchase Invoice Modal */}
      {selectedPurchaseForModal && (
        <PurchaseInvoiceModal
          purchase={selectedPurchaseForModal}
          settings={settings}
          onClose={() => setSelectedPurchaseForModal(null)}
        />
      )}
    </div>
  );
};
