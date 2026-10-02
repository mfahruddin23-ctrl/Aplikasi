import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MaterialItem, StandardUnit, UnitConversionRule } from '../types';
import { STANDARD_UNITS } from '../utils/conversion';
import { formatRupiah, formatNumber, formatDateIndo } from '../utils/formatter';
import { exportReportToExcel, exportReportToPDF } from '../utils/exportUtils';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  ArrowUpDown,
  Layers,
  Scale,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { materials, addMaterial, updateMaterial, deleteMaterial, settings, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'safe'>('all');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Semen & Perekat');
  const [formBaseUnit, setFormBaseUnit] = useState<StandardUnit>('Sak');
  const [formBuyPrice, setFormBuyPrice] = useState<number>(0);
  const [formSellPrice, setFormSellPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formWholesaleMinQty, setFormWholesaleMinQty] = useState<number>(10);
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(10);
  const [formLocation, setFormLocation] = useState<string>('Gudang Utama');

  // Conversions for item
  const [conversions, setConversions] = useState<UnitConversionRule[]>([]);

  // Unique categories
  const categories = useMemo(() => {
    const list = [
      'Semen & Perekat',
      'Besi & Baja',
      'Pasir & Agregat',
      'Bata & Ringan',
      'Cat & Finishing',
      'Kayu & Triplek',
      'Pipa & Sanitasi',
      'Keramik & Granit',
      'Alat & Aksesoris',
      'Lainnya',
    ];
    return ['Semua', ...list];
  }, []);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchCat = selectedCategory === 'Semua' || m.category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.barcode.toLowerCase().includes(q);

      let matchStock = true;
      if (stockFilter === 'low') matchStock = m.stock <= m.minStock && m.stock > 0;
      else if (stockFilter === 'out') matchStock = m.stock <= 0;
      else if (stockFilter === 'safe') matchStock = m.stock > m.minStock;

      return matchCat && matchSearch && matchStock;
    });
  }, [materials, selectedCategory, searchTerm, stockFilter]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingMaterial(null);
    const nextCode = `MAT-${String(materials.length + 1).padStart(3, '0')}`;
    setFormCode(nextCode);
    setFormBarcode(`899${String(Date.now()).slice(-7)}`);
    setFormName('');
    setFormCategory('Semen & Perekat');
    setFormBaseUnit('Sak');
    setFormBuyPrice(0);
    setFormSellPrice(0);
    setFormWholesalePrice(0);
    setFormWholesaleMinQty(10);
    setFormStock(50);
    setFormMinStock(15);
    setFormLocation('Gudang Utama - Rak A1');
    setConversions([]);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (m: MaterialItem) => {
    setEditingMaterial(m);
    setFormCode(m.code);
    setFormBarcode(m.barcode);
    setFormName(m.name);
    setFormCategory(m.category);
    setFormBaseUnit(m.baseUnit);
    setFormBuyPrice(m.buyPrice);
    setFormSellPrice(m.sellPrice);
    setFormWholesalePrice(m.wholesalePrice);
    setFormWholesaleMinQty(m.wholesaleMinQty);
    setFormStock(m.stock);
    setFormMinStock(m.minStock);
    setFormLocation(m.location);
    setConversions(m.conversions || []);
    setIsModalOpen(true);
  };

  // Add conversion rule in modal
  const handleAddConversionRow = () => {
    const defaultUnit: StandardUnit = formBaseUnit === 'Sak' ? 'Kg' : 'PCS';
    setConversions((prev) => [
      ...prev,
      {
        unit: defaultUnit,
        factorToBase: 0.1,
        price: Math.round(formSellPrice * 0.1),
      },
    ]);
  };

  const handleUpdateConversion = (
    index: number,
    field: keyof UnitConversionRule,
    value: any
  ) => {
    setConversions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveConversion = (index: number) => {
    setConversions((prev) => prev.filter((_, i) => i !== index));
  };

  // Save form
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama barang material wajib diisi!');
      return;
    }

    const matPayload = {
      code: formCode,
      barcode: formBarcode,
      name: formName,
      category: formCategory,
      baseUnit: formBaseUnit,
      conversions: conversions,
      buyPrice: formBuyPrice,
      sellPrice: formSellPrice,
      wholesalePrice: formWholesalePrice,
      wholesaleMinQty: formWholesaleMinQty,
      stock: formStock,
      minStock: formMinStock,
      location: formLocation,
    };

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, matPayload);
    } else {
      addMaterial(matPayload);
    }

    setIsModalOpen(false);
  };

  // Delete material
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus material "${name}" dari database katalog?`)) {
      deleteMaterial(id);
    }
  };

  // Export to Excel with Company Kop
  const handleExportExcel = () => {
    exportReportToExcel({
      fileName: `Katalog_Stok_Material_${settings.storeName.replace(/\s+/g, '_')}`,
      sheetName: 'Stok Material',
      reportTitle: 'LAPORAN STOK & DAFTAR HARGA MATERIAL BANGUNAN',
      dateRangeText: `Posisi Stok Per ${formatDateIndo(new Date().toISOString())}`,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'Kode Barang', key: 'code' },
        { header: 'Barcode', key: 'barcode' },
        { header: 'Nama Material', key: 'name' },
        { header: 'Kategori', key: 'category' },
        { header: 'Satuan', key: 'baseUnit' },
        { header: 'Harga Beli HPP (Rp)', key: 'buyPrice' },
        { header: 'Harga Jual Ecer (Rp)', key: 'sellPrice' },
        { header: 'Harga Grosir (Rp)', key: 'wholesalePrice' },
        { header: 'Stok Gudang', key: 'stock' },
        { header: 'Min Stok', key: 'minStock' },
        { header: 'Nilai Aset Modal (Rp)', key: 'assetValue' },
        { header: 'Lokasi Rak', key: 'location' },
      ],
      data: filteredMaterials.map((m) => ({
        code: m.code,
        barcode: m.barcode || '-',
        name: m.name,
        category: m.category,
        baseUnit: m.baseUnit,
        buyPrice: m.buyPrice,
        sellPrice: m.sellPrice,
        wholesalePrice: m.wholesalePrice,
        stock: m.stock,
        minStock: m.minStock,
        assetValue: m.stock * m.buyPrice,
        location: m.location,
      })),
      summaryRows: [
        { label: 'TOTAL JUMLAH MATERIAL', value: filteredMaterials.length },
        {
          label: 'TOTAL VALUASI ASET STOK (HPP)',
          value: filteredMaterials.reduce((s, m) => s + m.stock * m.buyPrice, 0),
        },
      ],
    });
  };

  // Export to PDF with Company Kop
  const handleExportPDF = () => {
    exportReportToPDF({
      fileName: `Katalog_Stok_Material_${settings.storeName.replace(/\s+/g, '_')}`,
      reportTitle: 'LAPORAN STOK & DAFTAR HARGA MATERIAL BANGUNAN',
      dateRangeText: `Posisi Stok Per ${formatDateIndo(new Date().toISOString())}`,
      settings,
      operatorName: currentUser.name,
      columns: [
        { header: 'Kode', dataKey: 'code' },
        { header: 'Nama Material', dataKey: 'name' },
        { header: 'Kategori', dataKey: 'category' },
        { header: 'Satuan', dataKey: 'baseUnit' },
        { header: 'Harga Beli (HPP)', dataKey: 'buyPrice' },
        { header: 'Harga Jual', dataKey: 'sellPrice' },
        { header: 'Stok', dataKey: 'stock' },
        { header: 'Nilai Aset HPP', dataKey: 'assetValue' },
      ],
      data: filteredMaterials.map((m) => ({
        code: m.code,
        name: m.name,
        category: m.category,
        baseUnit: m.baseUnit,
        buyPrice: formatRupiah(m.buyPrice),
        sellPrice: formatRupiah(m.sellPrice),
        stock: `${m.stock} ${m.baseUnit}`,
        assetValue: formatRupiah(m.stock * m.buyPrice),
      })),
      summaryNotes: [
        `Total Ragam Barang Material: ${filteredMaterials.length} jenis`,
        `Total Nilai Aset Modal Persediaan: ${formatRupiah(
          filteredMaterials.reduce((s, m) => s + m.stock * m.buyPrice, 0)
        )}`,
      ],
    });
  };

  return (
    <div id="inventory-view-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            Data Barang & Material Bangunan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola kode barang, barcode, multi-satuan konversi, harga beli/jual/grosir, dan kontrol persediaan stok.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-material-excel"
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            id="btn-export-material-pdf"
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-300"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>PDF (.pdf)</span>
          </button>
          <button
            id="btn-add-material"
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Material Baru</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-material"
            type="text"
            placeholder="Cari nama semen, besi, bata, kode, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50"
          />
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-4">
          <select
            id="select-filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50 font-medium"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Kategori: {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stock status filter */}
        <div className="lg:col-span-3">
          <select
            id="select-filter-stock"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50 font-medium"
          >
            <option value="all">Semua Kondisi Stok</option>
            <option value="low">Stok Menipis (⚠️)</option>
            <option value="out">Stok Habis (0)</option>
            <option value="safe">Stok Aman</option>
          </select>
        </div>
      </div>

      {/* Material Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                <th className="py-3 px-3">Kode / Barcode</th>
                <th className="py-3 px-3">Nama Material Bangunan</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3 text-center">Satuan Dasar & Konversi</th>
                <th className="py-3 px-3 text-right">Harga Beli (Modal)</th>
                <th className="py-3 px-3 text-right">Harga Jual (Eceran)</th>
                <th className="py-3 px-3 text-right">Harga Grosir</th>
                <th className="py-3 px-3 text-center">Stok / Min</th>
                <th className="py-3 px-3">Lokasi Gudang</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.map((mat) => {
                const isLow = mat.stock <= mat.minStock && mat.stock > 0;
                const isOut = mat.stock <= 0;

                return (
                  <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-slate-800 block">{mat.code}</span>
                      <span className="text-[10px] text-slate-400">{mat.barcode}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block text-xs">{mat.name}</span>
                      <span className="text-[10px] text-slate-400">ID: {mat.id}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                        {mat.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        {mat.baseUnit}
                      </span>
                      {mat.conversions.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          +{mat.conversions.length} satuan:{' '}
                          {mat.conversions.map((c) => c.unit).join(', ')}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-600 font-medium">
                      {formatRupiah(mat.buyPrice)}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(mat.sellPrice)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {mat.wholesalePrice > 0 ? (
                        <div>
                          <span className="font-semibold text-emerald-700 block">
                            {formatRupiah(mat.wholesalePrice)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (min {mat.wholesaleMinQty} {mat.baseUnit})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {formatNumber(mat.stock)} / {mat.minStock} {mat.baseUnit}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 text-[11px] font-medium">
                      {mat.location}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(mat)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(mat.id, mat.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* CREATE / EDIT MATERIAL MODAL */}
      {isModalOpen && (
        <div
          id="material-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div
            id="material-form-modal"
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col border border-slate-200"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingMaterial ? 'Edit Data Material Bangunan' : 'Tambah Material Bangunan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Row 1: Code, Barcode, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Kode Barang:</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Barcode / EAN:</label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Kategori Material:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                  >
                    {categories.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Nama Lengkap Material (Spesifikasi & Ukuran):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Semen Gresik 50 Kg / Besi Beton 10mm SNI 12m"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800"
                />
              </div>

              {/* Row 3: Base Unit, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Satuan Dasar Utama (Gudang):</label>
                  <select
                    value={formBaseUnit}
                    onChange={(e) => setFormBaseUnit(e.target.value as StandardUnit)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-emerald-50/50"
                  >
                    {STANDARD_UNITS.map((u) => (
                      <option key={u.unit} value={u.unit}>
                        {u.unit} - {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Lokasi Rak / Penyimpanan:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gudang Utama Rak A-02"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Row 4: Pricing */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 block">Struktur Harga (Satuan Dasar):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-600">Harga Beli / Modal (Rp):</label>
                    <input
                      type="number"
                      required
                      value={formBuyPrice}
                      onChange={(e) => setFormBuyPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-600">Harga Jual Eceran (Rp):</label>
                    <input
                      type="number"
                      required
                      value={formSellPrice}
                      onChange={(e) => setFormSellPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-emerald-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-600">Harga Grosir (Rp):</label>
                    <input
                      type="number"
                      value={formWholesalePrice}
                      onChange={(e) => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Min. Pembelian untuk Grosir:</span>
                  <input
                    type="number"
                    value={formWholesaleMinQty}
                    onChange={(e) => setFormWholesaleMinQty(parseFloat(e.target.value) || 1)}
                    className="w-20 px-2 py-1 rounded border border-slate-300 text-center font-bold"
                  />
                  <span className="font-bold text-slate-700">{formBaseUnit}</span>
                </div>
              </div>

              {/* Row 5: Stock & Min Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Stok Saat Ini ({formBaseUnit}):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Batas Stok Minimal (Alert):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-amber-700"
                  />
                </div>
              </div>

              {/* Row 6: Multi-Unit Conversions Configuration */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span>Konfigurasi Konversi Satuan Lain (Multi-Satuan)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddConversionRow}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Satuan</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-600">
                  Contoh: Jika satuan dasar adalah <strong>Sak (40 Kg)</strong>, tambahkan konversi ke <strong>Kg</strong> dengan faktor <strong>0.025</strong> (1 Kg = 0.025 Sak) dan harga per Kg.
                </p>

                {conversions.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-2 bg-white/60 rounded-lg">
                    Belum ada satuan tambahan. Klik "Tambah Satuan" di atas jika produk dapat dijual eceran/berbeda satuan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conversions.map((conv, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 items-center"
                      >
                        <div className="col-span-3">
                          <label className="text-[10px] text-slate-400 block">Satuan:</label>
                          <select
                            value={conv.unit}
                            onChange={(e) => handleUpdateConversion(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-bold"
                          >
                            {STANDARD_UNITS.filter((u) => u.unit !== formBaseUnit).map((u) => (
                              <option key={u.unit} value={u.unit}>
                                {u.unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4">
                          <label className="text-[10px] text-slate-400 block">
                            Faktor ke {formBaseUnit}:
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={conv.factorToBase}
                            onChange={(e) =>
                              handleUpdateConversion(idx, 'factorToBase', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold"
                            placeholder="e.g. 0.025"
                          />
                        </div>

                        <div className="col-span-4">
                          <label className="text-[10px] text-slate-400 block">Harga Jual (Rp):</label>
                          <input
                            type="number"
                            value={conv.price}
                            onChange={(e) =>
                              handleUpdateConversion(idx, 'price', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold"
                          />
                        </div>

                        <div className="col-span-1 text-center pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveConversion(idx)}
                            className="text-slate-300 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  id="btn-save-material-submit"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  Simpan Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
