import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StandardUnit } from '../types';
import {
  STANDARD_UNITS,
  COMMON_MATERIAL_CONVERSIONS,
  calculateBaseQuantity,
  getUnitPrice,
} from '../utils/conversion';
import { formatRupiah, formatNumber } from '../utils/formatter';
import {
  ArrowLeftRight,
  Scale,
  Calculator,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Info,
} from 'lucide-react';

export const UnitConverterView: React.FC = () => {
  const { materials } = useApp();

  // Mode: Material catalog item or generic calculation
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || '');
  const [inputQty, setInputQty] = useState<number>(1);
  const [selectedFromUnit, setSelectedFromUnit] = useState<StandardUnit>('Sak');
  const [selectedToUnit, setSelectedToUnit] = useState<StandardUnit>('Kg');

  // Generic conversion state
  const [genericSourceQty, setGenericSourceQty] = useState<number>(1);
  const [genericConversionIdx, setGenericConversionIdx] = useState<number>(0);

  const activeMaterial = materials.find((m) => m.id === selectedMaterialId);

  // Sync default units when material changes
  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    const m = materials.find((item) => item.id === matId);
    if (m) {
      setSelectedFromUnit(m.baseUnit);
      if (m.conversions.length > 0) {
        setSelectedToUnit(m.conversions[0].unit);
      } else {
        setSelectedToUnit(m.baseUnit);
      }
    }
  };

  // Calculate material conversion
  let convertedQty = 0;
  let unitPriceInfo = { price: 0, isWholesale: false };
  let baseEquivalent = 0;

  if (activeMaterial) {
    baseEquivalent = calculateBaseQuantity(activeMaterial, selectedFromUnit, inputQty);

    if (selectedToUnit === activeMaterial.baseUnit) {
      convertedQty = baseEquivalent;
    } else {
      const conv = activeMaterial.conversions.find((c) => c.unit === selectedToUnit);
      if (conv && conv.factorToBase > 0) {
        // baseQty = targetQty * factorToBase => targetQty = baseQty / factorToBase
        convertedQty = baseEquivalent / conv.factorToBase;
      } else {
        convertedQty = baseEquivalent;
      }
    }

    unitPriceInfo = getUnitPrice(activeMaterial, selectedFromUnit, inputQty);
  }

  const selectedRef = COMMON_MATERIAL_CONVERSIONS[genericConversionIdx];
  const genericResult = genericSourceQty * (selectedRef?.ratio || 1);

  return (
    <div id="unit-converter-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              Kalkulator & Logika Konversi Satuan Material
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fitur wajib toko material bangunan: hitung konversi sak ke kg, kubik ke colt/truk, batang ke meter, dus ke lembar, dll.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product-based live converter */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Konversi Berdasarkan Katalog Barang Toko
                </h3>
              </div>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                Terhubung Stok & Harga
              </span>
            </div>

            {/* Select Material */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pilih Barang Material:</label>
              <select
                id="select-converter-material"
                value={selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} (Satuan Utama: {m.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            {activeMaterial && (
              <>
                {/* Conversion inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {/* From Unit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Jumlah & Satuan Awal:</label>
                    <div className="flex space-x-2">
                      <input
                        id="input-converter-qty"
                        type="number"
                        min="0.1"
                        step="any"
                        value={inputQty}
                        onChange={(e) => setInputQty(Math.max(0.01, parseFloat(e.target.value) || 0))}
                        className="w-24 px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 bg-white"
                      />
                      <select
                        id="select-converter-from-unit"
                        value={selectedFromUnit}
                        onChange={(e) => setSelectedFromUnit(e.target.value as StandardUnit)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                      >
                        <option value={activeMaterial.baseUnit}>{activeMaterial.baseUnit} (Utama)</option>
                        {activeMaterial.conversions.map((c) => (
                          <option key={c.unit} value={c.unit}>
                            {c.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* To Unit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Dikonversi Ke Satuan:</label>
                    <select
                      id="select-converter-to-unit"
                      value={selectedToUnit}
                      onChange={(e) => setSelectedToUnit(e.target.value as StandardUnit)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                    >
                      <option value={activeMaterial.baseUnit}>{activeMaterial.baseUnit} (Utama)</option>
                      {activeMaterial.conversions.map((c) => (
                        <option key={c.unit} value={c.unit}>
                          {c.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conversion Result Card */}
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Hasil Konversi:
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Stok Tersedia: {formatNumber(activeMaterial.stock)} {activeMaterial.baseUnit}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-3">
                    <span className="text-3xl font-black text-emerald-900 tracking-tight">
                      {formatNumber(convertedQty)}
                    </span>
                    <span className="text-base font-bold text-emerald-700">{selectedToUnit}</span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {inputQty} {selectedFromUnit}
                    </span>{' '}
                    setara dengan{' '}
                    <span className="font-semibold text-slate-800">
                      {formatNumber(baseEquivalent)} {activeMaterial.baseUnit} (Satuan Dasar)
                    </span>
                  </p>

                  <div className="pt-2 border-t border-emerald-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Estimasi Harga Jual:</span>
                      <span className="font-bold text-slate-800">
                        {formatRupiah(unitPriceInfo.price * inputQty)}
                      </span>
                      {unitPriceInfo.isWholesale && (
                        <span className="ml-1 text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          Grosir
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Harga Satuan ({selectedFromUnit}):</span>
                      <span className="font-semibold text-slate-700">
                        {formatRupiah(unitPriceInfo.price)} / {selectedFromUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Material Conversions Rule List */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    Aturan Konversi yang Terdaftar untuk Produk Ini:
                  </label>
                  {activeMaterial.conversions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg">
                      Produk ini hanya menggunakan 1 satuan dasar ({activeMaterial.baseUnit}). Anda dapat menambahkan satuan konversi di menu Data Barang.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeMaterial.conversions.map((conv, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-200"
                        >
                          <span className="font-medium text-slate-700">
                            1 {conv.unit} = {conv.factorToBase} {activeMaterial.baseUnit}
                          </span>
                          <span className="font-semibold text-emerald-700">
                            Harga: {formatRupiah(conv.price)} / {conv.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Generic Quick Calculator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Scale className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                Kalkulator Standar Konversi Lapangan / Proyek
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Pilih Rumus Konversi:</label>
                <select
                  id="select-generic-conversion"
                  value={genericConversionIdx}
                  onChange={(e) => setGenericConversionIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                >
                  {COMMON_MATERIAL_CONVERSIONS.map((c, i) => (
                    <option key={i} value={i}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Input Jumlah ({selectedRef?.sourceUnit}):
                </label>
                <input
                  id="input-generic-qty"
                  type="number"
                  min="0.1"
                  step="any"
                  value={genericSourceQty}
                  onChange={(e) => setGenericSourceQty(Math.max(0.1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                />
              </div>
            </div>

            {selectedRef && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500">{selectedRef.explanation}</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {genericSourceQty} {selectedRef.sourceUnit} =
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700">
                    {formatNumber(genericResult)}
                  </span>
                  <span className="text-xs font-bold text-slate-600 ml-1.5">
                    {selectedRef.targetUnit}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reference Cheat Sheet */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                Tabel Referensi Satuan Material Bangunan
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Panduan satuan baku yang didukung di sistem POS Toko Material ini:
            </p>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {STANDARD_UNITS.map((u, i) => (
                <div key={i} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        {u.unit}
                      </span>
                      <span className="font-semibold text-slate-700">{u.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{u.description}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                    {u.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick tips */}
          <div className="bg-emerald-800 text-white p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Otomatisasi di Kasir POS</span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Saat kasir melayani pembeli semen eceran (misalnya beli 5 Kg semen dari karung 40 Kg),
              kasir cukup memilih satuan <strong>Kg</strong> di keranjang belanja. Sistem otomatis memotong stok semen sebesar 0.125 Sak dan mengenakan harga per Kg secara akurat tanpa kalkulator manual!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
