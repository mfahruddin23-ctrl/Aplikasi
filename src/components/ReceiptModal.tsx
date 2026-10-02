import React, { useState } from 'react';
import { Transaction, StoreSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatter';
import {
  Printer,
  X,
  FileText,
  Receipt,
  CheckCircle,
  Truck,
  Phone,
  MapPin,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { exportSalesInvoiceToPDF, exportSalesInvoiceToExcel } from '../utils/exportUtils';

interface ReceiptModalProps {
  transaction: Transaction;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
}) => {
  const [printType, setPrintType] = useState<'thermal' | 'invoice'>(
    settings.thermalPaperSize ? 'thermal' : 'invoice'
  );
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>(
    settings.thermalPaperSize || '80mm'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="receipt-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {printType === 'thermal' ? <Receipt className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {printType === 'thermal' ? 'Struk Kasir Thermal' : 'Invoice & Surat Jalan A4'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">No: {transaction.invoiceNo}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Print Type Switcher */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                id="btn-switch-thermal"
                type="button"
                onClick={() => setPrintType('thermal')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  printType === 'thermal'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thermal POS
              </button>
              <button
                id="btn-switch-invoice"
                type="button"
                onClick={() => setPrintType('invoice')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  printType === 'invoice'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Invoice A4
              </button>
            </div>

            <button
              id="btn-close-receipt"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content / Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 flex justify-center">
          {printType === 'thermal' ? (
            /* THERMAL RECEIPT PREVIEW */
            <div
              id="printable-area"
              className={`bg-white p-5 shadow-md border border-slate-200 text-slate-800 font-mono text-xs ${
                thermalWidth === '58mm' ? 'w-[300px]' : 'w-[380px]'
              }`}
            >
              {/* Thermal Size selector inside preview */}
              <div className="flex justify-end space-x-2 mb-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setThermalWidth('58mm')}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    thermalWidth === '58mm'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  58 mm
                </button>
                <button
                  type="button"
                  onClick={() => setThermalWidth('80mm')}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    thermalWidth === '80mm'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  80 mm
                </button>
              </div>

              {/* Store Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                {settings.companyLogoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={settings.companyLogoUrl}
                      alt={settings.storeName}
                      className="max-h-12 max-w-[140px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  {settings.storeName}
                </h2>
                <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}</p>
                <p className="text-[10px] text-slate-600">Telp/WA: {settings.phone}</p>
              </div>

              {/* Metadata */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>No. Nota:</span>
                  <span className="font-bold">{transaction.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{formatDateIndo(transaction.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{transaction.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-semibold">{transaction.customerName}</span>
                </div>
                {transaction.deliveryDriver && (
                  <div className="flex justify-between text-slate-600">
                    <span>Pengiriman:</span>
                    <span>{transaction.deliveryDriver}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-2.5 border-b border-dashed border-slate-400">
                <div className="space-y-2">
                  {transaction.items.map((item, idx) => (
                    <div key={idx} className="text-[11px]">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="flex justify-between text-slate-600 pl-1">
                        <span>
                          {item.qty} {item.unit} x {formatRupiah(item.unitPrice)}
                          {item.discount > 0 ? ` (Disc ${formatRupiah(item.discount)})` : ''}
                        </span>
                        <span className="font-medium text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(transaction.subtotal)}</span>
                </div>
                {transaction.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon Nota:</span>
                    <span>-{formatRupiah(transaction.discountTotal)}</span>
                  </div>
                )}
                {transaction.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>PPN ({transaction.taxPercent}%):</span>
                    <span>{formatRupiah(transaction.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>GRAND TOTAL:</span>
                  <span className="text-emerald-700">{formatRupiah(transaction.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Metode Bayar:</span>
                  <span className="font-semibold">{transaction.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Bayar / Diterima:</span>
                  <span>{formatRupiah(transaction.amountPaid)}</span>
                </div>
                {transaction.isDebt ? (
                  <>
                    <div className="flex justify-between font-bold text-rose-600 pt-1">
                      <span>Sisa Hutang:</span>
                      <span>{formatRupiah(transaction.debtRemaining || 0)}</span>
                    </div>
                    {transaction.debtDueDate && (
                      <div className="flex justify-between text-rose-700 text-[10px]">
                        <span>Jatuh Tempo:</span>
                        <span>{transaction.debtDueDate}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between font-semibold">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(transaction.change)}</span>
                  </div>
                )}
              </div>

              {/* Footer Notice */}
              <div className="text-center pt-3 text-[10px] text-slate-500 leading-tight">
                <p>{settings.receiptFooter}</p>
                <p className="mt-1 font-semibold text-slate-700">*** TERIMA KASIH ***</p>
              </div>
            </div>
          ) : (
            /* INVOICE & SURAT JALAN A4 PREVIEW */
            <div
              id="printable-area"
              className="bg-white p-8 shadow-md border border-slate-200 text-slate-800 text-xs w-full max-w-xl font-sans"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-4">
                <div className="flex items-start gap-3">
                  {settings.companyLogoUrl && (
                    <div className="w-14 h-14 rounded-xl border border-slate-200 p-1 bg-white shrink-0 flex items-center justify-center shadow-xs">
                      <img
                        src={settings.companyLogoUrl}
                        alt={settings.storeName}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black text-emerald-800 tracking-tight">
                      {settings.storeName}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">{settings.tagline}</p>
                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {settings.address}
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {settings.phone} | {settings.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded text-xs uppercase tracking-wider mb-1">
                    FAKTUR / SURAT JALAN
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-800">{transaction.invoiceNo}</p>
                  <p className="text-slate-500 text-[11px]">{formatDateIndo(transaction.date)}</p>
                </div>
              </div>

              {/* Recipient / Delivery Info */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-[11px]">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Kepada Yth (Pelanggan):
                  </p>
                  <p className="font-semibold text-slate-900 text-xs">{transaction.customerName}</p>
                  {transaction.notes && (
                    <p className="text-slate-500 italic mt-1">Catatan: {transaction.notes}</p>
                  )}
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600" /> Pengiriman & Kasir:
                  </p>
                  <p className="text-slate-700">
                    Kasir: <span className="font-medium text-slate-900">{transaction.cashierName}</span>
                  </p>
                  <p className="text-slate-700">
                    Armada / Sopir:{' '}
                    <span className="font-medium text-slate-900">
                      {transaction.deliveryDriver || 'Diambil Sendiri (Langsung)'}
                    </span>
                  </p>
                  {transaction.deliveryPlate && (
                    <p className="text-slate-700">
                      No. Polisi:{' '}
                      <span className="font-mono font-medium">{transaction.deliveryPlate}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Table of items */}
              <div className="py-3">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[10px]">
                      <th className="py-2 px-2">No</th>
                      <th className="py-2 px-2">Kode</th>
                      <th className="py-2 px-2">Nama Material Bangunan</th>
                      <th className="py-2 px-2 text-center">Qty / Satuan</th>
                      <th className="py-2 px-2 text-right">Harga Satuan</th>
                      <th className="py-2 px-2 text-right">Diskon</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaction.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2 font-mono text-slate-500 text-[10px]">{item.code}</td>
                        <td className="py-2 px-2 font-medium text-slate-900">{item.name}</td>
                        <td className="py-2 px-2 text-center font-semibold">
                          {item.qty} {item.unit}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="py-2 px-2 text-right text-rose-600">
                          {item.discount > 0 ? formatRupiah(item.discount) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals and Bank Info */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-[11px]">
                <div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-1">
                    <p className="font-semibold text-slate-700">Pembayaran Transfer Bank Toko:</p>
                    {settings.bankAccounts.map((b, i) => (
                      <p key={i} className="text-slate-600">
                        {b.bank}: <span className="font-mono font-medium">{b.accountNo}</span> (a/n{' '}
                        {b.accountHolder})
                      </p>
                    ))}
                  </div>
                  {transaction.isDebt && (
                    <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[10px]">
                      <p className="font-bold">STATUS TRANSAKSI: TEMPO (HUTANG)</p>
                      <p>Sisa Hutang: {formatRupiah(transaction.debtRemaining || 0)}</p>
                      <p>Jatuh Tempo: {transaction.debtDueDate || '-'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold">{formatRupiah(transaction.subtotal)}</span>
                  </div>
                  {transaction.discountTotal > 0 && (
                    <div className="flex justify-between py-0.5 text-rose-600">
                      <span>Diskon Faktur:</span>
                      <span>-{formatRupiah(transaction.discountTotal)}</span>
                    </div>
                  )}
                  {transaction.taxAmount > 0 && (
                    <div className="flex justify-between py-0.5 text-slate-600">
                      <span>PPN {transaction.taxPercent}%:</span>
                      <span>{formatRupiah(transaction.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-t border-slate-300 font-bold text-sm text-slate-900">
                    <span>GRAND TOTAL:</span>
                    <span className="text-emerald-700">{formatRupiah(transaction.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                    <span>Metode Pembayaran:</span>
                    <span className="font-semibold">{transaction.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                    <span>Dibayar:</span>
                    <span>{formatRupiah(transaction.amountPaid)}</span>
                  </div>
                  {!transaction.isDebt && (
                    <div className="flex justify-between py-0.5 font-semibold text-emerald-700 text-[11px]">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(transaction.change)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 text-center mt-6 pt-4 border-t border-slate-200 text-[10px]">
                <div>
                  <p className="text-slate-500 mb-8">Penerima / Proyek</p>
                  <p className="border-b border-slate-400 w-3/4 mx-auto"></p>
                  <p className="text-slate-600 mt-1">(......................................)</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-8">Pengemudi / Sopir</p>
                  <p className="border-b border-slate-400 w-3/4 mx-auto"></p>
                  <p className="text-slate-600 mt-1 font-medium">
                    ({transaction.deliveryDriver || '......................................'})
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-8">Hormat Kami (Kasir)</p>
                  <p className="border-b border-slate-400 w-3/4 mx-auto"></p>
                  <p className="text-slate-900 font-semibold mt-1">({transaction.cashierName})</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>KOP Perusahaan: <strong className="text-slate-800">{settings.storeName}</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-download-invoice-excel"
              type="button"
              onClick={() => exportSalesInvoiceToExcel(transaction, settings)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition-colors"
              title="Unduh faktur dalam format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              id="btn-download-invoice-pdf"
              type="button"
              onClick={() => exportSalesInvoiceToPDF(transaction, settings)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold text-xs transition-colors"
              title="Unduh faktur dalam format PDF (.pdf)"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>Unduh PDF</span>
            </button>

            <button
              id="btn-trigger-print"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print</span>
            </button>

            <button
              id="btn-dismiss-receipt-bottom"
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
