import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MaterialItem, StockMovement } from '../types';
import { formatNumber, formatDateIndo } from '../utils/formatter';
import {
  Boxes,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  History,
  Check,
  X,
  FileText,
} from 'lucide-react';

export const StockManagementView: React.FC = () => {
  const { materials, stockMovements, adjustStock, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'opname' | 'history'>('opname');

  // Opname Adjustment Modal
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState<boolean>(false);
  const [targetMaterial, setTargetMaterial] = useState<MaterialItem | null>(null);
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [opnameReason, setOpnameReason] = useState<string>('Penghitungan fisik berkala');

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const q = searchTerm.toLowerCase().trim();
      return (
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [materials, searchTerm]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((mov) => {
      if (selectedMaterialId !== 'all' && mov.materialId !== selectedMaterialId) {
        return false;
      }
      return true;
    });
  }, [stockMovements, selectedMaterialId]);

  // Open Opname modal
  const handleOpenOpname = (mat: MaterialItem) => {
    setTargetMaterial(mat);
    setPhysicalCount(mat.stock);
    setOpnameReason('Pemeriksaan fisik stok gudang');
    setIsOpnameModalOpen(true);
  };

  // Submit Opname
  const handleConfirmOpname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMaterial) return;

    adjustStock({
      materialId: targetMaterial.id,
      physicalCount,
      notes: opnameReason,
      operatorName: currentUser.name,
    });

    setIsOpnameModalOpen(false);
  };

  return (
    <div id="stock-management-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Manajemen Stok & Stock Opname Material
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit stok fisik vs saldo sistem komputer, sesuaikan selisih (opname), dan pantau kartu mutasi keluar-masuk.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('opname')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'opname'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar & Penyesuaian Opname
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kartu Mutasi Riwayat Stok ({stockMovements.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OPNAME TABLE */}
      {activeTab === 'opname' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari material untuk opname..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50"
              />
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Menampilkan {filteredMaterials.length} jenis material
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">Kode Material</th>
                    <th className="py-3 px-3">Nama Material Bangunan</th>
                    <th className="py-3 px-3">Kategori & Lokasi Rak</th>
                    <th className="py-3 px-3 text-center">Satuan Dasar</th>
                    <th className="py-3 px-3 text-center">Stok Sistem Saat Ini</th>
                    <th className="py-3 px-3 text-center">Status Keamanan</th>
                    <th className="py-3 px-3 text-center">Aksi Opname</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((mat) => {
                    const isLow = mat.stock <= mat.minStock && mat.stock > 0;
                    const isOut = mat.stock <= 0;

                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{mat.code}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{mat.name}</td>
                        <td className="py-3 px-3 text-slate-500">
                          <span>{mat.category}</span>
                          <span className="text-[10px] text-slate-400 block">{mat.location}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {mat.baseUnit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-black text-sm text-slate-900">
                          {formatNumber(mat.stock)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOut
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOut ? 'Habis (0)' : isLow ? 'Stok Kritis' : 'Aman'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenOpname(mat)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-colors flex items-center gap-1.5 mx-auto"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Sesuaikan Stok Fisik</span>
                          </button>
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

      {/* TAB 2: STOCK MOVEMENT MUTATION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-2 w-full sm:w-96">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Filter Material:
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium"
              >
                <option value="all">Semua Material</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Total Log Tercatat: <strong>{filteredMovements.length}</strong>
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <th className="py-3 px-3">Tanggal & Waktu</th>
                    <th className="py-3 px-3">Nama Material</th>
                    <th className="py-3 px-3 text-center">Tipe Mutasi</th>
                    <th className="py-3 px-3 text-center">Satuan Dasar</th>
                    <th className="py-3 px-3 text-right">Stok Awal</th>
                    <th className="py-3 px-3 text-center">Perubahan</th>
                    <th className="py-3 px-3 text-right">Stok Akhir</th>
                    <th className="py-3 px-3">Keterangan / Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map((mov) => {
                    const isPlus = mov.changeQty > 0;
                    const isZero = mov.changeQty === 0;

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-500">{formatDateIndo(mov.date)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{mov.materialName}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              mov.type === 'Masuk'
                                ? 'bg-blue-100 text-blue-800'
                                : mov.type === 'Keluar'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {mov.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-medium">
                          {mov.baseUnit}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {formatNumber(mov.beforeQty)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isPlus ? 'text-emerald-600' : isZero ? 'text-slate-400' : 'text-rose-600'
                            }`}
                          >
                            {isPlus ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isPlus ? `+${formatNumber(mov.changeQty)}` : formatNumber(mov.changeQty)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          {formatNumber(mov.afterQty)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <p className="font-semibold text-slate-800">{mov.notes}</p>
                          <p className="text-[10px] text-slate-400">Oleh: {mov.operatorName}</p>
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

      {/* STOCK OPNAME ADJUSTMENT MODAL */}
      {isOpnameModalOpen && targetMaterial && (
        <div
          id="opname-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Form Penyesuaian Stok (Opname)
                </h3>
                <p className="text-xs text-slate-500">{targetMaterial.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpnameModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpname} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Stok Sistem Sekarang:</span>
                  <span className="font-bold text-slate-800">
                    {formatNumber(targetMaterial.stock)} {targetMaterial.baseUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lokasi Penyimpanan:</span>
                  <span className="font-semibold text-slate-700">{targetMaterial.location}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Hasil Hitung Fisik Sebenarnya ({targetMaterial.baseUnit}):
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-lg font-black text-slate-900 bg-white"
                />
              </div>

              {/* Difference calculation */}
              <div className="p-3 rounded-xl border flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600">Selisih Penyesuaian:</span>
                <span
                  className={
                    physicalCount - targetMaterial.stock >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }
                >
                  {physicalCount - targetMaterial.stock >= 0 ? '+' : ''}
                  {formatNumber(physicalCount - targetMaterial.stock)} {targetMaterial.baseUnit}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Alasan Penyesuaian:</label>
                <select
                  value={opnameReason}
                  onChange={(e) => setOpnameReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                >
                  <option value="Penghitungan fisik berkala">Penghitungan fisik berkala</option>
                  <option value="Barang rusak / bocor / patah">Barang rusak / bocor / patah</option>
                  <option value="Susut timbangan / penguapan">Susut timbangan / penguapan</option>
                  <option value="Selisih penerimaan supplier">Selisih penerimaan supplier</option>
                  <option value="Koreksi kesalahan input kasir">Koreksi kesalahan input kasir</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOpnameModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Simpan Hasil Opname
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
