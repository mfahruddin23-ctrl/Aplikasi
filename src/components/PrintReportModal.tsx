import React from 'react';
import { StoreSettings } from '../types';
import { formatDateIndo } from '../utils/formatter';
import { X, Printer, CheckCircle, FileText } from 'lucide-react';

interface PrintReportModalProps {
  reportTitle: string;
  periodText: string;
  settings: StoreSettings;
  operatorName: string;
  columns: { header: string; align?: 'left' | 'center' | 'right' }[];
  dataRows: (string | number)[][];
  summaryCards?: { label: string; value: string }[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  reportTitle,
  periodText,
  settings,
  operatorName,
  columns,
  dataRows,
  summaryCards,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const now = new Date();
  const printDateStr = formatDateIndo(now.toISOString()) + ' ' + now.toLocaleTimeString('id-ID');

  return (
    <div
      id="print-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="print-report-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Pratinjau Dokumen Cetak Laporan</h3>
              <p className="text-xs text-slate-500">
                {reportTitle} • {periodText}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-trigger-print-report"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>
            <button
              id="btn-close-print-report"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 overflow-y-auto bg-slate-100/70 flex justify-center">
          <div
            id="printable-area"
            className="bg-white p-8 sm:p-10 shadow-lg border border-slate-200 w-full max-w-4xl text-slate-800 text-xs min-h-[800px] flex flex-col justify-between"
          >
            <div>
              {/* Kop Perusahaan Resmi */}
              <div className="flex justify-between items-start border-b-2 border-emerald-800 pb-4 mb-4">
                <div>
                  <h1 className="text-xl font-black text-emerald-900 tracking-tight">
                    {settings.storeName.toUpperCase()}
                  </h1>
                  <p className="text-xs text-slate-700 italic font-medium">
                    {settings.tagline || 'Pusat Bahan Bangunan & Material Konstruksi Berkualitas'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">{settings.address}</p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Telp / WhatsApp: {settings.phone} {settings.email && `| Email: ${settings.email}`}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-800 text-white font-bold text-[11px] rounded tracking-wider uppercase">
                    DOKUMEN RESMI TOKO
                  </span>
                  <p className="text-[10px] text-slate-500 mt-2 font-mono">
                    Dicetak: {printDateStr}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Operator: <strong className="text-slate-800 font-semibold">{operatorName}</strong>
                  </p>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="text-center my-5">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  {reportTitle}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Periode Laporan: <strong className="text-slate-800">{periodText}</strong>
                </p>
              </div>

              {/* Summary Cards */}
              {summaryCards && summaryCards.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {summaryCards.map((card, idx) => (
                    <div key={idx} className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        {card.label}
                      </span>
                      <span className="text-xs font-black text-slate-900">{card.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-emerald-800 text-white font-bold text-center">
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          className={`py-2 px-2.5 border border-emerald-900 text-${
                            col.align || 'left'
                          }`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dataRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-1.5 px-2.5 border border-slate-200 text-${
                              columns[cIdx]?.align || 'left'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Signatures */}
            <div className="mt-12 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-500 mb-14">Dibuat Oleh (Kasir / Petugas Laporan):</p>
                  <p className="border-b border-slate-400 w-48 mx-auto"></p>
                  <p className="text-slate-900 font-bold mt-1.5">({operatorName})</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">Mengetahui & Menyetujui (Pimpinan / Owner):</p>
                  <p className="border-b border-slate-400 w-48 mx-auto"></p>
                  <p className="text-slate-900 font-bold mt-1.5">(..........................................)</p>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6 font-mono">
                {settings.storeName} • Laporan ini dicetak secara sah melalui Sistem Aplikasi POS Material
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Format cetak presisi A4 dengan kop resmi {settings.storeName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
