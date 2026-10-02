import React from 'react';
import { PurchaseInvoice, StoreSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatter';
import {
  X,
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Building2,
  Calendar,
  Truck,
} from 'lucide-react';
import { exportPurchaseInvoiceToPDF, exportPurchaseInvoiceToExcel } from '../utils/exportUtils';

interface PurchaseInvoiceModalProps {
  purchase: PurchaseInvoice;
  settings: StoreSettings;
  onClose: () => void;
}

export const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  purchase,
  settings,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="purchase-invoice-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="purchase-invoice-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                Faktur Pembelian / Penerimaan Barang Masuk
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                No. Sistem: {purchase.invoiceNo} | No. Supplier: {purchase.supplierInvoiceNo || '-'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-purchase-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Body / Print Area */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 flex justify-center">
          <div
            id="printable-area"
            className="bg-white p-8 shadow-md border border-slate-200 w-full max-w-2xl text-slate-800 text-xs"
          >
            {/* Kop Perusahaan */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {settings.storeName.toUpperCase()}
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  {settings.tagline || 'Pusat Bahan Bangunan & Konstruksi Terlengkap'}
                </p>
                <p className="text-[10px] text-slate-500">{settings.address}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Telp/WA: {settings.phone} {settings.email && `| ${settings.email}`}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded uppercase">
                  FAKTUR PEMBELIAN
                </span>
                <p className="font-mono font-bold text-slate-800 mt-2 text-sm">{purchase.invoiceNo}</p>
                <p className="text-slate-500 text-[11px]">{formatDateIndo(purchase.date)}</p>
              </div>
            </div>

            {/* Supplier & Receipt Info Grid */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Distributor / Pabrik:
                </span>
                <p className="font-bold text-slate-900 text-sm">{purchase.supplierName}</p>
                <p className="text-slate-600">No. Nota Pabrik: {purchase.supplierInvoiceNo || '-'}</p>
              </div>

              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Status Pembayaran:
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    purchase.paymentStatus === 'Lunas'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {purchase.paymentStatus.toUpperCase()}
                </span>
                <p className="text-slate-500 text-[10px] mt-1">
                  Penerima Gudang: <strong className="text-slate-700">{purchase.cashierName}</strong>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse mb-4 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="py-2 px-2 text-center w-8">No</th>
                  <th className="py-2 px-3 text-left">Nama Material Konstruksi</th>
                  <th className="py-2 px-2 text-center w-24">Jumlah</th>
                  <th className="py-2 px-3 text-right w-28">Harga Beli HPP</th>
                  <th className="py-2 px-3 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchase.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{item.materialName}</td>
                    <td className="py-2 px-2 text-center font-mono">
                      {item.qty} {item.unit}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {formatRupiah(item.buyPrice)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end pt-2 border-t border-slate-300">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Total Pembelian:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(purchase.totalAmount)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>Jumlah Terbayar:</span>
                  <span className="font-semibold">{formatRupiah(purchase.amountPaid)}</span>
                </div>
                {purchase.paymentStatus === 'Hutang' && (
                  <div className="flex justify-between py-0.5 text-rose-700 font-bold">
                    <span>Sisa Hutang Dagang:</span>
                    <span>{formatRupiah(purchase.debtRemaining)}</span>
                  </div>
                )}
                {purchase.dueDate && (
                  <div className="flex justify-between py-0.5 text-slate-500 text-[10px]">
                    <span>Jatuh Tempo:</span>
                    <span>{formatDateIndo(purchase.dueDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center mt-10 pt-4 border-t border-slate-200 text-[11px]">
              <div>
                <p className="text-slate-500 mb-12">Diserahkan oleh (Distributor/Ekspedisi):</p>
                <p className="border-b border-slate-400 w-48 mx-auto"></p>
                <p className="text-slate-600 mt-1">({purchase.supplierName})</p>
              </div>
              <div>
                <p className="text-slate-500 mb-12">Diterima & Diperiksa (Gudang/Admin):</p>
                <p className="border-b border-slate-400 w-48 mx-auto"></p>
                <p className="text-slate-900 font-bold mt-1">({purchase.cashierName})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>KOP: <strong className="text-slate-800">{settings.storeName}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-download-purchase-excel"
              type="button"
              onClick={() => exportPurchaseInvoiceToExcel(purchase, settings)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition-colors"
              title="Unduh faktur pembelian Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              id="btn-download-purchase-pdf"
              type="button"
              onClick={() => exportPurchaseInvoiceToPDF(purchase, settings)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold text-xs transition-colors"
              title="Unduh faktur pembelian PDF (.pdf)"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>Unduh PDF</span>
            </button>

            <button
              id="btn-trigger-print-purchase"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print</span>
            </button>

            <button
              id="btn-dismiss-purchase-modal"
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
