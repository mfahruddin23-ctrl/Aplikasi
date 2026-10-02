import { StandardUnit, MaterialItem } from '../types';

export interface UnitInfo {
  unit: StandardUnit;
  label: string;
  category: string;
  typicalBase?: string;
  description: string;
}

export const STANDARD_UNITS: UnitInfo[] = [
  { unit: 'PCS', label: 'Pcs / Biji / Buah', category: 'Satuan', description: 'Untuk bata, batako, hebel, kran air, fitting pipa' },
  { unit: 'Sak', label: 'Sak (Zak)', category: 'Semen & Mortar', description: 'Standar kemasan semen 40kg / 50kg / mortar' },
  { unit: 'Batang', label: 'Batang (Lonjor)', category: 'Besi & Pipa & Kayu', description: 'Panjang 12m (besi), 4m (pipa/kaso/kayu)' },
  { unit: 'Meter', label: 'Meter (m / m¹)', category: 'Panjang', description: 'Eceran pipa, selang, kawat, kabel, seng talang' },
  { unit: 'Kubik', label: 'Kubik (m³)', category: 'Volume', description: 'Pasir, batu belah, koral/split, hebel, kayu papan' },
  { unit: 'Colt', label: 'Colt / Truk Pick-up', category: 'Volume Transport', description: 'Muatan pasir/batu 1 rit armada pick-up/colt (~2.5 - 3 m³)' },
  { unit: 'Ton', label: 'Ton', category: 'Berat', description: '1.000 Kg - Pasir armada tronton, semen curah/partai, besi partai' },
  { unit: 'Kg', label: 'Kilogram (Kg)', category: 'Berat', description: 'Paku, bendrat, eceran semen, kawat, cat kiloan' },
  { unit: 'Lembar', label: 'Lembar', category: 'Luas & Lembaran', description: 'Triplek, seng gelombang, asbes, kalsiboard, gypsum' },
  { unit: 'Dus', label: 'Dus / Box', category: 'Kemasan Box', description: 'Keramik lantai/dinding, granit, paku per dus (30kg), baut' },
  { unit: 'Liter', label: 'Liter', category: 'Cair', description: 'Thinner, pengeras semen / sika, anti rayap, cat cair' },
  { unit: 'Kaleng', label: 'Kaleng (0.8 - 1 Kg/Ltr)', category: 'Cat & Kimia', description: 'Cat besi, vernis, lem kayu, cat semprot' },
  { unit: 'Pail', label: 'Pail / Galon Besar (20-25 Kg)', category: 'Cat & Kimia', description: 'Cat tembok kemasan ember besar 20kg - 25kg' },
  { unit: 'Roll', label: 'Roll / Gulung', category: 'Gulungan', description: 'Kawat loket, kawat bronjong, terpal, paranet, selang' },
];

export interface StandardConversionReference {
  name: string;
  sourceUnit: StandardUnit;
  targetUnit: StandardUnit;
  ratio: number; // 1 source = ratio target
  explanation: string;
}

export const COMMON_MATERIAL_CONVERSIONS: StandardConversionReference[] = [
  {
    name: 'Semen Sak 40 Kg ke Kilogram',
    sourceUnit: 'Sak',
    targetUnit: 'Kg',
    ratio: 40,
    explanation: '1 Sak semen standar berisi 40 Kilogram',
  },
  {
    name: 'Semen Sak 50 Kg ke Kilogram',
    sourceUnit: 'Sak',
    targetUnit: 'Kg',
    ratio: 50,
    explanation: '1 Sak semen jumbo berisi 50 Kilogram',
  },
  {
    name: 'Besi Beton SNI 12 Meter ke Meter',
    sourceUnit: 'Batang',
    targetUnit: 'Meter',
    ratio: 12,
    explanation: '1 Batang besi beton panjang utuh SNI = 12 Meter',
  },
  {
    name: 'Pipa PVC AW / D 4 Meter ke Meter',
    sourceUnit: 'Batang',
    targetUnit: 'Meter',
    ratio: 4,
    explanation: '1 Batang pipa PVC pabrik = 4 Meter',
  },
  {
    name: 'Kayu Kaso / Balok 4 Meter ke Meter',
    sourceUnit: 'Batang',
    targetUnit: 'Meter',
    ratio: 4,
    explanation: '1 Batang kayu kaso / reng standar = 4 Meter',
  },
  {
    name: 'Pasir 1 Rit Colt / Pick-Up ke Kubik',
    sourceUnit: 'Colt',
    targetUnit: 'Kubik',
    ratio: 2.8,
    explanation: '1 Bak Colt pick-up rata-rata muat 2.5 s.d 3.0 m³',
  },
  {
    name: 'Hebel 10cm 1 Kubik ke Pcs',
    sourceUnit: 'Kubik',
    targetUnit: 'PCS',
    ratio: 83.33,
    explanation: '1 Kubik hebel ukuran 60x20x10 cm berisi ~83 Pcs',
  },
  {
    name: 'Hebel 7.5cm 1 Kubik ke Pcs',
    sourceUnit: 'Kubik',
    targetUnit: 'PCS',
    ratio: 111.11,
    explanation: '1 Kubik hebel ukuran 60x20x7.5 cm berisi ~111 Pcs',
  },
  {
    name: 'Keramik 40x40 1 Dus ke Lembar',
    sourceUnit: 'Dus',
    targetUnit: 'Lembar',
    ratio: 6,
    explanation: '1 Dus keramik 40x40 berisi 6 keping (~0.96 m²)',
  },
  {
    name: 'Paku 1 Dus Karton ke Kilogram',
    sourceUnit: 'Dus',
    targetUnit: 'Kg',
    ratio: 30,
    explanation: '1 Karton paku kayu original pabrik = 30 Kg',
  },
  {
    name: 'Cat Pail 20 Kg ke Kaleng Galon (5 Kg)',
    sourceUnit: 'Pail',
    targetUnit: 'Kg',
    ratio: 20,
    explanation: '1 Pail cat tembok setara 4 galon atau 20 Kg',
  },
];

/**
 * Calculates how much base unit quantity a transaction quantity represents
 */
export function calculateBaseQuantity(
  material: MaterialItem,
  selectedUnit: StandardUnit,
  qty: number
): number {
  if (selectedUnit === material.baseUnit) {
    return qty;
  }
  const conv = material.conversions.find((c) => c.unit === selectedUnit);
  if (conv) {
    return qty * conv.factorToBase;
  }
  return qty;
}

/**
 * Gets the unit price for a material based on the selected unit,
 * checking whether wholesale pricing applies.
 */
export function getUnitPrice(
  material: MaterialItem,
  selectedUnit: StandardUnit,
  qty: number
): { price: number; isWholesale: boolean } {
  const baseQty = calculateBaseQuantity(material, selectedUnit, qty);
  const isWholesale = baseQty >= material.wholesaleMinQty && material.wholesalePrice > 0;

  if (selectedUnit === material.baseUnit) {
    return {
      price: isWholesale ? material.wholesalePrice : material.sellPrice,
      isWholesale,
    };
  }

  const conv = material.conversions.find((c) => c.unit === selectedUnit);
  if (conv) {
    if (isWholesale && conv.wholesalePrice && conv.wholesalePrice > 0) {
      return { price: conv.wholesalePrice, isWholesale: true };
    }
    return { price: conv.price, isWholesale: false };
  }

  // Fallback if no specific conversion price is defined: scale from base price
  const factor = 1;
  const unitPrice = isWholesale ? material.wholesalePrice * factor : material.sellPrice * factor;
  return { price: unitPrice, isWholesale };
}
