import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { StoreSettings, Transaction, PurchaseInvoice, MaterialItem } from '../types';
import { formatRupiah, formatDateIndo } from './formatter';

/**
 * Utility to download array buffer as file
 */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// EXCEL EXPORTS (WITH OFFICIAL COMPANY HEADER)
// ==========================================

export interface ExcelExportOptions {
  fileName: string;
  sheetName: string;
  reportTitle: string;
  dateRangeText?: string;
  settings: StoreSettings;
  operatorName: string;
  columns: { header: string; key: string }[];
  data: Record<string, any>[];
  summaryRows?: { label: string; value: string | number }[];
}

export function exportReportToExcel(options: ExcelExportOptions) {
  const {
    fileName,
    sheetName,
    reportTitle,
    dateRangeText,
    settings,
    operatorName,
    columns,
    data,
    summaryRows,
  } = options;

  const now = new Date();
  const printDateStr = formatDateIndo(now.toISOString()) + ' ' + now.toLocaleTimeString('id-ID');

  // Build rows array of arrays (AOA)
  const rows: any[][] = [
    [settings.storeName.toUpperCase()],
    [settings.tagline || 'Pusat Bahan Bangunan & Material Konstruksi'],
    [`Alamat: ${settings.address}`],
    [`No. Telp/WA: ${settings.phone} | Email: ${settings.email || '-'}`],
    ['------------------------------------------------------------------------------------------------------'],
    [reportTitle.toUpperCase()],
    [
      `Periode: ${dateRangeText || 'Semua Periode'} | Tanggal Cetak: ${printDateStr} | Dicetak Oleh: ${operatorName}`,
    ],
    [], // Blank line
    columns.map((c) => c.header), // Table Headers
  ];

  // Add data rows
  data.forEach((item) => {
    const row = columns.map((col) => {
      const val = item[col.key];
      return val !== undefined && val !== null ? val : '';
    });
    rows.push(row);
  });

  // Add summary rows if provided
  if (summaryRows && summaryRows.length > 0) {
    rows.push([]); // Blank line
    summaryRows.forEach((s) => {
      const summaryRow = new Array(columns.length).fill('');
      summaryRow[0] = s.label;
      summaryRow[columns.length - 1] = s.value;
      rows.push(summaryRow);
    });
  }

  // Create worksheet & workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = columns.map((_, i) => ({ wch: i === 0 ? 15 : i === 2 ? 30 : 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  // Write file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// ==========================================
// PDF EXPORTS (WITH OFFICIAL COMPANY HEADER)
// ==========================================

export interface PDFExportOptions {
  fileName: string;
  reportTitle: string;
  dateRangeText?: string;
  settings: StoreSettings;
  operatorName: string;
  columns: { header: string; dataKey: string }[];
  data: Record<string, any>[];
  summaryNotes?: string[];
  orientation?: 'portrait' | 'landscape';
}

export function exportReportToPDF(options: PDFExportOptions) {
  const {
    fileName,
    reportTitle,
    dateRangeText,
    settings,
    operatorName,
    columns,
    data,
    summaryNotes,
    orientation = 'landscape',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const printDateStr = formatDateIndo(now.toISOString()) + ' ' + now.toLocaleTimeString('id-ID');

  // --- KOP SURAT PERUSAHAAN ---
  // Store Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 110, 80); // Emerald 800
  doc.text(settings.storeName.toUpperCase(), 14, 15);

  // Tagline
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(settings.tagline || 'Pusat Bahan Bangunan & Material Konstruksi Berkualitas', 14, 20);

  // Address & Contacts
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${settings.address} | Telp/WA: ${settings.phone} | Email: ${settings.email || '-'}`, 14, 25);

  // Decorative Double Line
  doc.setDrawColor(16, 110, 80);
  doc.setLineWidth(0.8);
  doc.line(14, 28, pageWidth - 14, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29.5, pageWidth - 14, 29.5);

  // --- REPORT TITLE & META ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(reportTitle.toUpperCase(), 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Periode: ${dateRangeText || 'Semua Periode'}  |  Dicetak: ${printDateStr}  |  Operator: ${operatorName}`,
    14,
    41
  );

  // --- TABLE VIA AUTOTABLE ---
  autoTable(doc, {
    startY: 45,
    columns: columns.map((col) => ({ header: col.header, dataKey: col.dataKey })),
    body: data,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [16, 110, 80], // Emerald 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (dataPage) => {
      // Footer page numbers
      const str = `Halaman ${dataPage.pageNumber} dari ${doc.getNumberOfPages()}`;
      doc.setFontSize(7.5);
      doc.setTextColor(140);
      doc.text(str, pageWidth - 35, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Dicetak otomatis oleh Sistem POS ${settings.storeName}`, 14, doc.internal.pageSize.getHeight() - 8);
    },
  });

  // Final vertical position
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 120;

  // Add Summary notes / signatures if space permits
  if (finalY + 30 < doc.internal.pageSize.getHeight()) {
    if (summaryNotes && summaryNotes.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Ringkasan Laporan:', 14, finalY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      summaryNotes.forEach((note, idx) => {
        doc.text(`• ${note}`, 16, finalY + 4 + idx * 4);
      });
    }

    // Signatures
    const sigY = finalY + 12;
    const rightCol = pageWidth - 60;
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text('Dibuat Oleh (Kasir / Petugas):', 14, sigY);
    doc.text('Mengetahui (Pimpinan / Owner):', rightCol, sigY);

    doc.line(14, sigY + 18, 55, sigY + 18);
    doc.text(`(${operatorName})`, 14, sigY + 22);

    doc.line(rightCol, sigY + 18, rightCol + 45, sigY + 18);
    doc.text('(..........................................)', rightCol, sigY + 22);
  }

  doc.save(`${fileName}.pdf`);
}

// ==========================================
// EXCEL INVOICE EXPORT (FAKTUR PENJUALAN)
// ==========================================
export function exportSalesInvoiceToExcel(tx: Transaction, settings: StoreSettings) {
  const rows: any[][] = [
    [settings.storeName.toUpperCase()],
    [settings.tagline || 'Pusat Bahan Bangunan & Konstruksi Terlengkap'],
    [`Alamat: ${settings.address}`],
    [`No. Telepon / WhatsApp: ${settings.phone}`],
    ['========================================================================'],
    ['FAKTUR PENJUALAN MATERIAL & SURAT JALAN'],
    [`No. Faktur: ${tx.invoiceNo}`, `Tanggal: ${formatDateIndo(tx.date)}`],
    [`Pelanggan: ${tx.customerName}`, `Kasir: ${tx.cashierName}`],
    [`Metode Pembayaran: ${tx.paymentMethod}`, `Status: ${tx.debtStatus || 'Lunas'}`],
    [
      `Armada / Supir: ${tx.deliveryDriver || '-'} (${tx.deliveryPlate || '-'})`,
      `Jatuh Tempo: ${tx.debtDueDate ? formatDateIndo(tx.debtDueDate) : '-'}`,
    ],
    [],
    ['No', 'Kode Barang', 'Nama Material', 'Jumlah', 'Satuan', 'Harga Satuan', 'Diskon', 'Subtotal (Rp)'],
  ];

  tx.items.forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.code,
      item.name,
      item.qty,
      item.unit,
      item.unitPrice,
      item.discount,
      item.subtotal,
    ]);
  });

  rows.push([]);
  rows.push(['', '', '', '', '', '', 'Subtotal:', tx.subtotal]);
  if (tx.discountTotal > 0) {
    rows.push(['', '', '', '', '', '', 'Diskon Total:', tx.discountTotal]);
  }
  if (tx.taxAmount > 0) {
    rows.push(['', '', '', '', '', '', `PPN (${tx.taxPercent}%):`, tx.taxAmount]);
  }
  rows.push(['', '', '', '', '', '', 'GRAND TOTAL:', tx.grandTotal]);
  rows.push(['', '', '', '', '', '', 'Jumlah Dibayar:', tx.amountPaid]);
  if (tx.isDebt) {
    rows.push(['', '', '', '', '', '', 'Sisa Hutang/Tempo:', tx.debtRemaining || 0]);
  } else {
    rows.push(['', '', '', '', '', '', 'Kembalian:', tx.change]);
  }

  rows.push([]);
  rows.push(['Rekening Pembayaran Toko:']);
  settings.bankAccounts.forEach((b) => {
    rows.push([`Bank ${b.bank}: ${b.accountNo} a/n ${b.accountHolder}`]);
  });

  rows.push([]);
  rows.push([settings.receiptFooter]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 32 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faktur');
  XLSX.writeFile(wb, `Faktur_${tx.invoiceNo}.xlsx`);
}

// ==========================================
// PDF INVOICE EXPORT (FAKTUR PENJUALAN)
// ==========================================
export function exportSalesInvoiceToPDF(tx: Transaction, settings: StoreSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // --- KOP PERUSAHAAN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 110, 80);
  doc.text(settings.storeName.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(settings.tagline || 'Pusat Bahan Bangunan & Konstruksi Terlengkap', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${settings.address} | Telp/WA: ${settings.phone}`, 14, 25);

  doc.setDrawColor(16, 110, 80);
  doc.setLineWidth(0.8);
  doc.line(14, 28, pageWidth - 14, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29.5, pageWidth - 14, 29.5);

  // --- INVOICE TITLE & STATUS BADGE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('FAKTUR PENJUALAN & SURAT JALAN', 14, 37);

  // Invoice Meta Grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);

  // Left Column
  doc.text(`No. Faktur: ${tx.invoiceNo}`, 14, 43);
  doc.text(`Tanggal: ${formatDateIndo(tx.date)}`, 14, 48);
  doc.text(`Kasir: ${tx.cashierName}`, 14, 53);
  if (tx.deliveryDriver) {
    doc.text(`Armada / Supir: ${tx.deliveryDriver} (${tx.deliveryPlate || '-'})`, 14, 58);
  }

  // Right Column
  const rightCol = 115;
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepada Yth: ${tx.customerName}`, rightCol, 43);
  doc.setFont('helvetica', 'normal');
  doc.text(`Metode Pembayaran: ${tx.paymentMethod}`, rightCol, 48);
  doc.text(`Status: ${tx.isDebt ? 'HUTANG / TEMPO' : 'LUNAS'}`, rightCol, 53);
  if (tx.debtDueDate) {
    doc.text(`Jatuh Tempo: ${formatDateIndo(tx.debtDueDate)}`, rightCol, 58);
  }

  // Table Items
  const tableRows = tx.items.map((item, idx) => [
    idx + 1,
    item.name,
    item.qty + ' ' + item.unit,
    formatRupiah(item.unitPrice),
    item.discount > 0 ? formatRupiah(item.discount) : '-',
    formatRupiah(item.subtotal),
  ]);

  autoTable(doc, {
    startY: tx.deliveryDriver ? 63 : 60,
    head: [['No', 'Deskripsi Material', 'Kuantitas', 'Harga Satuan', 'Diskon', 'Subtotal']],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: [16, 110, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Financial summary on right
  const sumX = 120;
  doc.setFontSize(8.5);
  doc.text('Subtotal:', sumX, finalY);
  doc.text(formatRupiah(tx.subtotal), pageWidth - 14, finalY, { align: 'right' });

  let curY = finalY + 4.5;
  if (tx.discountTotal > 0) {
    doc.text('Potongan Diskon:', sumX, curY);
    doc.text(`-${formatRupiah(tx.discountTotal)}`, pageWidth - 14, curY, { align: 'right' });
    curY += 4.5;
  }

  if (tx.taxAmount > 0) {
    doc.text(`PPN (${tx.taxPercent}%):`, sumX, curY);
    doc.text(formatRupiah(tx.taxAmount), pageWidth - 14, curY, { align: 'right' });
    curY += 4.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 110, 80);
  doc.text('GRAND TOTAL:', sumX, curY + 1);
  doc.text(formatRupiah(tx.grandTotal), pageWidth - 14, curY + 1, { align: 'right' });

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Jumlah Dibayar:', sumX, curY);
  doc.text(formatRupiah(tx.amountPaid), pageWidth - 14, curY, { align: 'right' });

  curY += 4.5;
  if (tx.isDebt) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 24, 93); // Rose 700
    doc.text('Sisa Hutang:', sumX, curY);
    doc.text(formatRupiah(tx.debtRemaining || 0), pageWidth - 14, curY, { align: 'right' });
  } else {
    doc.text('Kembalian:', sumX, curY);
    doc.text(formatRupiah(tx.change), pageWidth - 14, curY, { align: 'right' });
  }

  // Bank Info on Left
  const bankY = finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Pembayaran Transfer Rekening Toko:', 14, bankY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  settings.bankAccounts.slice(0, 3).forEach((b, i) => {
    doc.text(`• Bank ${b.bank}: ${b.accountNo} a/n ${b.accountHolder}`, 14, bankY + 4 + i * 4);
  });

  // Footer text
  const footerY = Math.max(curY + 10, bankY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(settings.receiptFooter || 'Terima kasih atas kunjungan & kerja sama Anda.', 14, footerY);

  // 3 Signatures
  const sigY = footerY + 8;
  const colW = (pageWidth - 28) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70);

  // Col 1
  doc.text('Penerima / Proyek', 14 + colW * 0.5, sigY, { align: 'center' });
  doc.line(14 + 5, sigY + 16, 14 + colW - 5, sigY + 16);
  doc.text('(......................................)', 14 + colW * 0.5, sigY + 20, { align: 'center' });

  // Col 2
  doc.text('Pengemudi / Supir', 14 + colW * 1.5, sigY, { align: 'center' });
  doc.line(14 + colW + 5, sigY + 16, 14 + colW * 2 - 5, sigY + 16);
  doc.text(`(${tx.deliveryDriver || '......................................'})`, 14 + colW * 1.5, sigY + 20, {
    align: 'center',
  });

  // Col 3
  doc.text('Hormat Kami (Kasir)', 14 + colW * 2.5, sigY, { align: 'center' });
  doc.line(14 + colW * 2 + 5, sigY + 16, 14 + colW * 3 - 5, sigY + 16);
  doc.text(`(${tx.cashierName})`, 14 + colW * 2.5, sigY + 20, { align: 'center' });

  doc.save(`Faktur_${tx.invoiceNo}.pdf`);
}

// ==========================================
// EXCEL & PDF PURCHASE INVOICE EXPORT
// ==========================================
export function exportPurchaseInvoiceToExcel(po: PurchaseInvoice, settings: StoreSettings) {
  const rows: any[][] = [
    [settings.storeName.toUpperCase()],
    [`FAKTUR PEMBELIAN BARANG MASUK DISTRIBUTOR`],
    [`No. Faktur Sistem: ${po.invoiceNo}`, `No. Faktur Supplier: ${po.supplierInvoiceNo || '-'}`],
    [`Supplier: ${po.supplierName}`, `Tanggal: ${formatDateIndo(po.date)}`],
    [`Status Bayar: ${po.paymentStatus}`, `Diterima Oleh: ${po.cashierName}`],
    [],
    ['No', 'Nama Material', 'Jumlah', 'Satuan', 'Harga Beli Satuan', 'Subtotal (Rp)'],
  ];

  po.items.forEach((item, idx) => {
    rows.push([idx + 1, item.materialName, item.qty, item.unit, item.buyPrice, item.subtotal]);
  });

  rows.push([]);
  rows.push(['', '', '', '', 'Total Pembelian:', po.totalAmount]);
  rows.push(['', '', '', '', 'Jumlah Terbayar:', po.amountPaid]);
  if (po.paymentStatus === 'Hutang') {
    rows.push(['', '', '', '', 'Sisa Hutang Supplier:', po.debtRemaining]);
    if (po.dueDate) {
      rows.push(['', '', '', '', 'Jatuh Tempo:', formatDateIndo(po.dueDate)]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faktur Pembelian');
  XLSX.writeFile(wb, `Faktur_Beli_${po.invoiceNo}.xlsx`);
}

export function exportPurchaseInvoiceToPDF(po: PurchaseInvoice, settings: StoreSettings) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Kop
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 110, 80);
  doc.text(settings.storeName.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${settings.address} | Telp: ${settings.phone}`, 14, 21);

  doc.setDrawColor(16, 110, 80);
  doc.setLineWidth(0.6);
  doc.line(14, 25, pageWidth - 14, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('FAKTUR PEMBELIAN / PENERIMAAN BARANG', 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50);
  doc.text(`No. Faktur Sistem: ${po.invoiceNo}`, 14, 38);
  doc.text(`No. Faktur Distributor: ${po.supplierInvoiceNo || '-'}`, 14, 43);
  doc.text(`Tanggal Masuk: ${formatDateIndo(po.date)}`, 14, 48);

  const rightCol = 115;
  doc.text(`Distributor / Supplier: ${po.supplierName}`, rightCol, 38);
  doc.text(`Status Pembayaran: ${po.paymentStatus.toUpperCase()}`, rightCol, 43);
  doc.text(`Penerima Gudang: ${po.cashierName}`, rightCol, 48);

  const tableRows = po.items.map((item, idx) => [
    idx + 1,
    item.materialName,
    item.qty + ' ' + item.unit,
    formatRupiah(item.buyPrice),
    formatRupiah(item.subtotal),
  ]);

  autoTable(doc, {
    startY: 53,
    head: [['No', 'Nama Material Konstruksi', 'Kuantitas', 'Harga Beli (HPP)', 'Subtotal']],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 110, 80], textColor: [255, 255, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 85 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const sumX = 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL PEMBELIAN:', sumX, finalY);
  doc.text(formatRupiah(po.totalAmount), pageWidth - 14, finalY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Jumlah Terbayar:', sumX, finalY + 5);
  doc.text(formatRupiah(po.amountPaid), pageWidth - 14, finalY + 5, { align: 'right' });

  if (po.paymentStatus === 'Hutang') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 24, 93);
    doc.text('Sisa Hutang Dagang:', sumX, finalY + 10);
    doc.text(formatRupiah(po.debtRemaining), pageWidth - 14, finalY + 10, { align: 'right' });
  }

  doc.save(`Faktur_Beli_${po.invoiceNo}.pdf`);
}
