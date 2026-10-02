import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Transaction, PaymentMethod } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatter';
import {
  Users,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  CreditCard,
  MessageCircle,
  Receipt,
  Calendar,
  Phone,
  MapPin,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';

export const CustomersDebtView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    recordCustomerDebtPayment,
    transactions,
    settings,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDebtOnly, setFilterDebtOnly] = useState<boolean>(false);

  // Selected customer for detail drawer / modal
  const [selectedCustDetail, setSelectedCustDetail] = useState<Customer | null>(null);

  // Add Customer Modal
  const [isAddCustModalOpen, setIsAddCustModalOpen] = useState<boolean>(false);
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custType, setCustType] = useState<'Umum' | 'Langganan' | 'Kontraktor' | 'Proyek'>('Kontraktor');
  const [custDebtLimit, setCustDebtLimit] = useState<number>(20000000);

  // Pay Debt Modal
  const [isPayDebtOpen, setIsPayDebtOpen] = useState<boolean>(false);
  const [payCust, setPayCust] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Tunai' | 'Transfer' | 'QRIS'>('Tunai');
  const [payNotes, setPayNotes] = useState<string>('Cicilan angsuran material bangunan');

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q);

      const matchDebt = !filterDebtOnly || c.currentDebt > 0;
      return matchSearch && matchDebt;
    });
  }, [customers, searchTerm, filterDebtOnly]);

  // Total Piutang
  const totalReceivable = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentDebt, 0);
  }, [customers]);

  // Customer transactions
  const customerTransactions = useMemo(() => {
    if (!selectedCustDetail) return [];
    return transactions.filter((t) => t.customerId === selectedCustDetail.id);
  }, [transactions, selectedCustDetail]);

  // Handle Add Customer
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    addCustomer({
      name: custName,
      phone: custPhone,
      address: custAddress,
      type: custType,
      debtLimit: custDebtLimit,
    });

    setIsAddCustModalOpen(false);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
  };

  // Open pay debt
  const handleOpenPayDebt = (cust: Customer) => {
    setPayCust(cust);
    setPayAmount(cust.currentDebt);
    setPayNotes(`Pembayaran piutang ${cust.name}`);
    setIsPayDebtOpen(true);
  };

  // Submit debt payment
  const handleConfirmPayDebt = () => {
    if (!payCust || payAmount <= 0) return;

    recordCustomerDebtPayment({
      customerId: payCust.id,
      amount: payAmount,
      paymentMethod: payMethod,
      notes: payNotes,
    });

    setIsPayDebtOpen(false);
    // Refresh selected customer detail if open
    if (selectedCustDetail && selectedCustDetail.id === payCust.id) {
      setSelectedCustDetail((prev) =>
        prev ? { ...prev, currentDebt: Math.max(0, prev.currentDebt - payAmount) } : null
      );
    }
  };

  // Generate WhatsApp reminder link
  const generateWhatsAppReminder = (cust: Customer) => {
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    let targetPhone = cleanPhone;
    if (targetPhone.startsWith('0')) {
      targetPhone = '62' + targetPhone.slice(1);
    }

    const message =
      `Halo Bapak/Ibu ${cust.name},\n\n` +
      `Salam dari *${settings.storeName}*.\n` +
      `Kami menginformasikan catatan kewajiban tagihan belanja material bangunan per tanggal hari ini dengan rincian:\n` +
      `• Sisa Piutang / Hutang: *${formatRupiah(cust.currentDebt)}*\n` +
      `• Plafon Kredit Tersedia: ${formatRupiah(cust.debtLimit)}\n\n` +
      `Pembayaran dapat ditransfer melalui:\n` +
      settings.bankAccounts.map((b) => `• ${b.bank}: ${b.accountNo} (a/n ${b.accountHolder})`).join('\n') +
      `\n\nAtau tunai langsung ke kasir toko kami. Terima kasih banyak atas kerja sama yang terjalin dengan baik! 🙏`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${targetPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div id="customers-debt-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Data Pelanggan & Piutang / Hutang Tempo
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau saldo hutang pelanggan, plafon limit kredit, cicilan tempo, dan reminder WhatsApp penagihan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-customer"
            type="button"
            onClick={() => setIsAddCustModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total Piutang Belum Terbayar</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{formatRupiah(totalReceivable)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Jumlah Mitra / Pelanggan Terdaftar</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{customers.length} Orang</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Pelanggan Memiliki Hutang Aktif</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {customers.filter((c) => c.currentDebt > 0).length} Pelanggan
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama kontraktor, nomor WA, alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterDebtOnly(false)}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              !filterDebtOnly ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
            }`}
          >
            Semua Pelanggan ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterDebtOnly(true)}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filterDebtOnly ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
            }`}
          >
            Hanya yang Berhutang ({customers.filter((c) => c.currentDebt > 0).length})
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                <th className="py-3 px-3">Nama Pelanggan & Tipe</th>
                <th className="py-3 px-3">Kontak / Telepon</th>
                <th className="py-3 px-3">Alamat / Proyek</th>
                <th className="py-3 px-3 text-right">Plafon Kredit</th>
                <th className="py-3 px-3 text-right">Sisa Hutang Aktif</th>
                <th className="py-3 px-3 text-center">Status Piutang</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const hasDebt = c.currentDebt > 0;
                const creditRemaining = Math.max(0, c.debtLimit - c.currentDebt);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{c.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                        {c.type}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {c.address}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatRupiah(c.debtLimit)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black text-sm ${
                          hasDebt ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatRupiah(c.currentDebt)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hasDebt
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {hasDebt ? 'Ada Hutang' : 'Lunas'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {hasDebt && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenPayDebt(c)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] border border-emerald-300"
                              title="Input Pembayaran Cicilan Hutang"
                            >
                              Bayar Cicilan
                            </button>
                            <button
                              type="button"
                              onClick={() => generateWhatsAppReminder(c)}
                              className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[11px] shadow-xs"
                              title="Kirim Notifikasi Tagihan via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedCustDetail(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                          title="Lihat Riwayat Transaksi"
                        >
                          Riwayat
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

      {/* CUSTOMER DETAIL MODAL / DRAWER */}
      {selectedCustDetail && (
        <div
          id="cust-detail-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  Profil & Riwayat Transaksi Pelanggan
                </h3>
                <p className="text-xs text-slate-500">{selectedCustDetail.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Profile Card */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor WhatsApp:</span>
                  <span className="font-bold text-slate-800">{selectedCustDetail.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tipe:</span>
                  <span className="font-bold text-slate-800">{selectedCustDetail.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sisa Hutang:</span>
                  <span className="font-black text-sm text-rose-600">
                    {formatRupiah(selectedCustDetail.currentDebt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Plafon Kredit:</span>
                  <span className="font-bold text-slate-800">
                    {formatRupiah(selectedCustDetail.debtLimit)}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Riwayat Nota Pembelian Pelanggan:</h4>
                {customerTransactions.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">
                    Belum ada riwayat transaksi tercatat untuk pelanggan ini.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {customerTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-800">{tx.invoiceNo}</span>
                          <span className="text-slate-400 text-[10px] ml-2">
                            {formatDateIndo(tx.date)}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {tx.items.length} jenis material ({tx.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ')})
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">
                            {formatRupiah(tx.grandTotal)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              tx.debtStatus === 'Lunas'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.paymentMethod} ({tx.debtStatus || 'Lunas'})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isAddCustModalOpen && (
        <div
          id="add-cust-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Tambah Pelanggan Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddCustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Pelanggan / Mandor Proyek:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak H. Bambang (Proyek Villa)"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nomor WhatsApp / HP:</label>
                <input
                  type="text"
                  required
                  placeholder="0812-xxxx-xxxx"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Alamat Kirim / Lokasi:</label>
                <textarea
                  rows={2}
                  placeholder="Alamat domisili atau titik drop material..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Kategori Pelanggan:</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="Kontraktor">Kontraktor</option>
                    <option value="Proyek">Proyek</option>
                    <option value="Langganan">Langganan</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Limit / Plafon Kredit (Rp):</label>
                  <input
                    type="number"
                    value={custDebtLimit}
                    onChange={(e) => setCustDebtLimit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DEBT PAYMENT MODAL */}
      {isPayDebtOpen && payCust && (
        <div
          id="pay-debt-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Pembayaran Cicilan Piutang
                </h3>
                <p className="text-xs text-slate-500">{payCust.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayDebtOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-rose-800">Total Sisa Hutang:</span>
                <span className="font-black text-base text-rose-700">
                  {formatRupiah(payCust.currentDebt)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nominal Pembayaran (Rp):</label>
                <input
                  type="number"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-base font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Metode Pembayaran:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Tunai', 'Transfer', 'QRIS'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-lg border font-semibold text-xs ${
                        payMethod === m
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Keterangan / No. Bukti:</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                <span className="text-slate-600">Sisa Hutang Setelah Bayar:</span>
                <span className="text-slate-900">
                  {formatRupiah(Math.max(0, payCust.currentDebt - payAmount))}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPayDebtOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayDebt}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
              >
                Simpan Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
