import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  MaterialItem,
  StandardUnit,
  Customer,
  Supplier,
  User,
  Role,
  UnitConversionRule,
} from '../types';
import { STANDARD_UNITS } from '../utils/conversion';
import { formatRupiah, formatNumber, formatDateIndo } from '../utils/formatter';
import { exportReportToExcel, exportReportToPDF } from '../utils/exportUtils';
import {
  Database,
  Boxes,
  Layers,
  Scale,
  Users,
  Truck,
  Shield,
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  FolderPlus,
  ArrowRight,
  Phone,
  MapPin,
  Building2,
  Lock,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  User as UserIcon,
} from 'lucide-react';

type MasterTab = 'materials' | 'categories' | 'units' | 'customers' | 'suppliers' | 'users';

export const MasterDataView: React.FC = () => {
  const {
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    customers,
    addCustomer,
    updateCustomer,
    suppliers,
    addSupplier,
    updateSupplier,
    users,
    addUser,
    updateUser,
    deleteUser,
    settings,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<MasterTab>('materials');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // ----------------------------------------------------
  // CATEGORIES STATE
  // ----------------------------------------------------
  // Extract categories dynamically from materials + default list
  const [customCategories, setCustomCategories] = useState<string[]>([
    'Semen & Perekat',
    'Besi & Baja',
    'Pasir & Agregat',
    'Bata & Ringan',
    'Cat & Finishing',
    'Kayu & Triplek',
    'Pipa & Sanitasi',
    'Keramik & Granit',
    'Alat & Aksesoris',
    'Atap & Plafon',
    'Baut & Paku',
  ]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (!customCategories.includes(newCatName.trim())) {
      setCustomCategories([...customCategories, newCatName.trim()]);
    }
    setNewCatName('');
    setShowAddCatModal(false);
  };

  // ----------------------------------------------------
  // UNITS STATE
  // ----------------------------------------------------
  const [customUnits, setCustomUnits] = useState<
    { name: string; type: string; desc: string }[]
  >([
    { name: 'Sak', type: 'Kemasan Berat', desc: 'Semen (40kg / 50kg), semen instan perekat hebel' },
    { name: 'Batang', type: 'Panjang Material', desc: 'Besi beton (12m), hollow plafon (4m), pipa PVC (4m)' },
    { name: 'Kubik (m³)', type: 'Volume Material', desc: 'Pasir cor, split, batu kali, bata ringan hebel' },
    { name: 'Ton', type: 'Berat Besar', desc: 'Besi tulangan proyek, semen curah, pasir ritase' },
    { name: 'Dus', type: 'Kemasan Keramik', desc: 'Keramik lantai 40x40 (1m²), granit 60x60 (1.44m²)' },
    { name: 'Lembar', type: 'Luasan Material', desc: 'Triplek, seng gelombang, spandek, gypsum, asbes' },
    { name: 'Kg', type: 'Berat Eceran', desc: 'Paku kayu, kawat bendrat, semen eceran, cat kiloan' },
    { name: 'Liter', type: 'Cairan Eceran', desc: 'Thinner, vernis, oli bekisting, pelapis anti bocor' },
    { name: 'Roll', type: 'Gulungan', desc: 'Kawat loket, talang seng roll, kabel listrik, selang' },
    { name: 'Pail', type: 'Ember Besar Pabrik', desc: 'Cat tembok besar 20kg - 25kg, waterproofing' },
    { name: 'Kaleng', type: 'Kemasan Cat', desc: 'Cat minyak/kayu 1kg - 5kg, lem kuning aibon' },
    { name: 'Colt / Rit', type: 'Armada Pengiriman', desc: 'Pasir pasang 1 colt pick up, split 1 rit truk engkel' },
    { name: 'Pcs', type: 'Satuan Satuan', desc: 'Kran air, fitting pipa elbow, gembok, sekop, roskam' },
    { name: 'Meter', type: 'Panjang Eceran', desc: 'Kabel listrik meteran, selang air, talang karet' },
  ]);
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newUnitType, setNewUnitType] = useState<string>('Kemasan');
  const [newUnitDesc, setNewUnitDesc] = useState<string>('');
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setCustomUnits([
      ...customUnits,
      { name: newUnitName.trim(), type: newUnitType, desc: newUnitDesc },
    ]);
    setNewUnitName('');
    setNewUnitDesc('');
    setShowAddUnitModal(false);
  };

  // ----------------------------------------------------
  // MATERIAL MODAL STATE
  // ----------------------------------------------------
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  const [formMatCode, setFormMatCode] = useState<string>('');
  const [formMatBarcode, setFormMatBarcode] = useState<string>('');
  const [formMatName, setFormMatName] = useState<string>('');
  const [formMatCategory, setFormMatCategory] = useState<string>('Semen & Perekat');
  const [formMatBaseUnit, setFormMatBaseUnit] = useState<StandardUnit>('Sak');
  const [formMatBuyPrice, setFormMatBuyPrice] = useState<number>(0);
  const [formMatSellPrice, setFormMatSellPrice] = useState<number>(0);
  const [formMatWholesalePrice, setFormMatWholesalePrice] = useState<number>(0);
  const [formMatWholesaleMinQty, setFormMatWholesaleMinQty] = useState<number>(10);
  const [formMatStock, setFormMatStock] = useState<number>(0);
  const [formMatMinStock, setFormMatMinStock] = useState<number>(10);
  const [formMatLocation, setFormMatLocation] = useState<string>('Gudang Utama');

  const openMaterialModal = (item?: MaterialItem) => {
    if (item) {
      setEditingMaterial(item);
      setFormMatCode(item.code);
      setFormMatBarcode(item.barcode || '');
      setFormMatName(item.name);
      setFormMatCategory(item.category);
      setFormMatBaseUnit(item.baseUnit);
      setFormMatBuyPrice(item.buyPrice);
      setFormMatSellPrice(item.sellPrice);
      setFormMatWholesalePrice(item.wholesalePrice);
      setFormMatWholesaleMinQty(item.wholesaleMinQty);
      setFormMatStock(item.stock);
      setFormMatMinStock(item.minStock);
      setFormMatLocation(item.location);
    } else {
      setEditingMaterial(null);
      const nextCode = `MAT-${String(materials.length + 1).padStart(3, '0')}`;
      setFormMatCode(nextCode);
      setFormMatBarcode('');
      setFormMatName('');
      setFormMatCategory('Semen & Perekat');
      setFormMatBaseUnit('Sak');
      setFormMatBuyPrice(0);
      setFormMatSellPrice(0);
      setFormMatWholesalePrice(0);
      setFormMatWholesaleMinQty(10);
      setFormMatStock(50);
      setFormMatMinStock(10);
      setFormMatLocation('Gudang Utama');
    }
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMatName.trim()) return;

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, {
        code: formMatCode,
        barcode: formMatBarcode,
        name: formMatName,
        category: formMatCategory,
        baseUnit: formMatBaseUnit,
        buyPrice: formMatBuyPrice,
        sellPrice: formMatSellPrice,
        wholesalePrice: formMatWholesalePrice,
        wholesaleMinQty: formMatWholesaleMinQty,
        stock: formMatStock,
        minStock: formMatMinStock,
        location: formMatLocation,
      });
    } else {
      addMaterial({
        code: formMatCode,
        barcode: formMatBarcode || `899${Date.now().toString().slice(-7)}`,
        name: formMatName,
        category: formMatCategory,
        baseUnit: formMatBaseUnit,
        conversions: [],
        buyPrice: formMatBuyPrice,
        sellPrice: formMatSellPrice,
        wholesalePrice: formMatWholesalePrice,
        wholesaleMinQty: formMatWholesaleMinQty,
        stock: formMatStock,
        minStock: formMatMinStock,
        location: formMatLocation,
      });
    }
    setIsMaterialModalOpen(false);
  };

  // ----------------------------------------------------
  // CUSTOMER MODAL STATE
  // ----------------------------------------------------
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custType, setCustType] = useState<'Umum' | 'Langganan' | 'Kontraktor' | 'Proyek'>('Kontraktor');
  const [custDebtLimit, setCustDebtLimit] = useState<number>(10000000);

  const openCustomerModal = (c?: Customer) => {
    if (c) {
      setEditingCustomer(c);
      setCustName(c.name);
      setCustPhone(c.phone);
      setCustAddress(c.address);
      setCustType(c.type);
      setCustDebtLimit(c.debtLimit);
    } else {
      setEditingCustomer(null);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustType('Kontraktor');
      setCustDebtLimit(10000000);
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: custName,
        phone: custPhone,
        address: custAddress,
        type: custType,
        debtLimit: custDebtLimit,
      });
    } else {
      addCustomer({
        name: custName,
        phone: custPhone,
        address: custAddress,
        type: custType,
        debtLimit: custDebtLimit,
      });
    }
    setIsCustomerModalOpen(false);
  };

  // ----------------------------------------------------
  // SUPPLIER MODAL STATE
  // ----------------------------------------------------
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supContact, setSupContact] = useState<string>('');
  const [supBank, setSupBank] = useState<string>('');

  const openSupplierModal = (s?: Supplier) => {
    if (s) {
      setEditingSupplier(s);
      setSupName(s.name);
      setSupPhone(s.phone);
      setSupAddress(s.address);
      setSupContact(s.contactPerson);
      setSupBank(s.bankInfo || '');
    } else {
      setEditingSupplier(null);
      setSupName('');
      setSupPhone('');
      setSupAddress('');
      setSupContact('');
      setSupBank('');
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: supName,
        phone: supPhone,
        address: supAddress,
        contactPerson: supContact,
        bankInfo: supBank,
      });
    } else {
      addSupplier({
        name: supName,
        phone: supPhone,
        address: supAddress,
        contactPerson: supContact,
        bankInfo: supBank,
      });
    }
    setIsSupplierModalOpen(false);
  };

  // ----------------------------------------------------
  // USER / PROFIL MODAL STATE (HAK AKSES ADMIN UTAMA)
  // ----------------------------------------------------
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'owner';
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userUsername, setUserUsername] = useState<string>('');
  const [userPassword, setUserPassword] = useState<string>('');
  const [showModalPassword, setShowModalPassword] = useState<boolean>(false);
  const [userPin, setUserPin] = useState<string>('');
  const [userRole, setUserRole] = useState<Role>('cashier');
  const [userRoleLabel, setUserRoleLabel] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');

  const openUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setUserName(u.name);
      setUserUsername(u.username);
      setUserPassword(u.password || u.pin || '');
      setUserPin(u.pin || '1234');
      setUserRole(u.role);
      setUserRoleLabel(u.roleLabel);
      setUserEmail(u.email || '');
      setUserPhone(u.phone || '');
      setUserAvatarUrl(u.avatarUrl || '');
    } else {
      setEditingUser(null);
      setUserName('');
      setUserUsername('');
      setUserPassword('1234');
      setUserPin('1234');
      setUserRole('cashier');
      setUserRoleLabel('Kasir POS');
      setUserEmail('');
      setUserPhone('');
      setUserAvatarUrl('');
    }
    setShowModalPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userUsername.trim()) return;

    const roleLabels: Record<Role, string> = {
      admin: 'Admin Utama',
      owner: 'Pemilik Toko',
      cashier: 'Kasir POS',
      warehouse: 'Kepala Gudang',
    };

    const payload = {
      name: userName.trim(),
      username: userUsername.trim().toLowerCase(),
      password: userPassword.trim() || userPin.trim(),
      pin: userPin.trim() || '1234',
      role: userRole,
      roleLabel: userRoleLabel.trim() || roleLabels[userRole],
      email: userEmail.trim(),
      phone: userPhone.trim(),
      avatarUrl: userAvatarUrl.trim(),
    };

    if (editingUser) {
      updateUser(editingUser.id, payload);
    } else {
      addUser(payload);
    }
    setIsUserModalOpen(false);
  };

  // ----------------------------------------------------
  // EXPORT MASTER DATA (EXCEL & PDF WITH KOP PERUSAHAAN)
  // ----------------------------------------------------
  const handleExportMaterialsExcel = () => {
    exportReportToExcel({
      fileName: `Master_Barang_Material_${settings.storeName.replace(/\s+/g, '_')}`,
      sheetName: 'Master Barang',
      reportTitle: 'MASTER DATA BARANG & MATERIAL BANGUNAN',
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
        { header: 'Min Grosir', key: 'wholesaleMinQty' },
        { header: 'Stok', key: 'stock' },
        { header: 'Min Stok', key: 'minStock' },
        { header: 'Lokasi Rak', key: 'location' },
      ],
      data: materials.map((m) => ({
        code: m.code,
        barcode: m.barcode || '-',
        name: m.name,
        category: m.category,
        baseUnit: m.baseUnit,
        buyPrice: m.buyPrice,
        sellPrice: m.sellPrice,
        wholesalePrice: m.wholesalePrice,
        wholesaleMinQty: m.wholesaleMinQty,
        stock: m.stock,
        minStock: m.minStock,
        location: m.location,
      })),
      summaryRows: [
        { label: 'TOTAL DATA BARANG', value: materials.length },
        {
          label: 'TOTAL NILAI ASET MODAL HPP',
          value: materials.reduce((s, m) => s + m.stock * m.buyPrice, 0),
        },
      ],
    });
  };

  const handleExportMaterialsPDF = () => {
    exportReportToPDF({
      fileName: `Master_Barang_Material_${settings.storeName.replace(/\s+/g, '_')}`,
      reportTitle: 'MASTER DATA BARANG & MATERIAL BANGUNAN',
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
        { header: 'Lokasi', dataKey: 'location' },
      ],
      data: materials.map((m) => ({
        code: m.code,
        name: m.name,
        category: m.category,
        baseUnit: m.baseUnit,
        buyPrice: formatRupiah(m.buyPrice),
        sellPrice: formatRupiah(m.sellPrice),
        stock: `${m.stock} ${m.baseUnit}`,
        location: m.location,
      })),
      summaryNotes: [
        `Total Master Barang: ${materials.length} item aktif terdaftar`,
        `Total Valuasi Aset Modal: ${formatRupiah(
          materials.reduce((s, m) => s + m.stock * m.buyPrice, 0)
        )}`,
      ],
    });
  };

  // Filtered lists
  const filteredMaterials = useMemo(() => {
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  return (
    <div id="master-data-page" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header with Company Kop */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-mono">
              {settings.storeName}
            </span>
            <span className="text-xs text-slate-400">• Pusat Manajemen Master Data</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 mt-1">
            <Database className="w-6 h-6 text-emerald-600" />
            Master Data Toko Material Bangunan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data terpusat: Master Barang, Kategori Material, Satuan Dasar/Konversi, Pelanggan Proyek, Distributor Supplier, dan Pengguna Sistem.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'materials' && (
            <>
              <button
                type="button"
                onClick={handleExportMaterialsExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportMaterialsPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                onClick={() => openMaterialModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Barang Baru</span>
              </button>
            </>
          )}

          {activeTab === 'categories' && (
            <button
              type="button"
              onClick={() => setShowAddCatModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tambah Kategori Baru</span>
            </button>
          )}

          {activeTab === 'units' && (
            <button
              type="button"
              onClick={() => setShowAddUnitModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Satuan Baru</span>
            </button>
          )}

          {activeTab === 'customers' && (
            <button
              type="button"
              onClick={() => openCustomerModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pelanggan Baru</span>
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button
              type="button"
              onClick={() => openSupplierModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Supplier Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'materials'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Master Barang ({materials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'categories'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kategori ({customCategories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('units')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'units'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Satuan ({customUnits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'customers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pelanggan ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'suppliers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Supplier ({suppliers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Pengguna ({users.length})</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari data master..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs w-48 sm:w-64 focus:bg-white focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* =======================================================
          TAB 1: MASTER DATA BARANG / MATERIAL
      ======================================================= */}
      {activeTab === 'materials' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Daftar Katalog Master Barang & Material ({filteredMaterials.length} Item)
              </h3>
              <p className="text-xs text-slate-500">
                Terhubung langsung ke Kasir POS, Gudang, dan Laporan Finansial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openMaterialModal()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Material</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Kode / Barcode</th>
                  <th className="py-3 px-3">Nama Material</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-center">Satuan Utama</th>
                  <th className="py-3 px-3 text-right">Harga Beli HPP</th>
                  <th className="py-3 px-3 text-right">Harga Jual Ecer</th>
                  <th className="py-3 px-3 text-right">Harga Grosir</th>
                  <th className="py-3 px-3 text-center">Stok</th>
                  <th className="py-3 px-3">Lokasi Gudang</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-800 block">{m.code}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.barcode || '-'}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{m.name}</td>
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {m.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                        {m.baseUnit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatRupiah(m.buyPrice)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(m.sellPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                      {formatRupiah(m.wholesalePrice)}
                      <span className="text-[9px] text-slate-400 block font-normal">
                        min. {m.wholesaleMinQty}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                          m.stock <= m.minStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {m.stock} {m.baseUnit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">{m.location}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openMaterialModal(m)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                          title="Edit Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus master ${m.name}?`)) {
                              deleteMaterial(m.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors"
                          title="Hapus Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* =======================================================
          TAB 2: MASTER KATEGORI MATERIAL
      ======================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customCategories.map((cat, idx) => {
              const catMaterials = materials.filter((m) => m.category === cat);
              const catAssetValue = catMaterials.reduce((s, m) => s + m.stock * m.buyPrice, 0);

              return (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        KAT-{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {catMaterials.length} SKU Barang
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-sm mt-1">{cat}</h4>
                    <p className="text-xs text-slate-500">
                      Total Valuasi Modal: <strong className="text-slate-700">{formatRupiah(catAssetValue)}</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Stok Fisik:{' '}
                      {catMaterials.reduce((s, m) => s + m.stock, 0).toLocaleString('id-ID')} unit
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm(cat);
                        setActiveTab('materials');
                      }}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-0.5 text-[11px]"
                    >
                      <span>Lihat Barang</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 3: MASTER DATA SATUAN (UNITS)
      ======================================================= */}
      {activeTab === 'units' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Master Satuan Bahan Bangunan & Standar Konversi Lapangan
              </h3>
              <p className="text-xs text-slate-500">
                Mendukung transaksi multi-satuan (Sak ↔ Kg, Batang ↔ Meter, Dus ↔ M², Truk/Colt ↔ M³).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddUnitModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Satuan Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-32">Nama Satuan</th>
                  <th className="py-3 px-4 w-44">Jenis / Kategori Satuan</th>
                  <th className="py-3 px-4">Deskripsi Penggunaan Konstruksi & Proyek</th>
                  <th className="py-3 px-4 text-center w-28">Jumlah Barang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customUnits.map((u, idx) => {
                  const usedCount = materials.filter(
                    (m) =>
                      m.baseUnit === u.name ||
                      m.conversions?.some((c) => c.unit === u.name)
                  ).length;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-mono">
                          {u.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {u.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.desc}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {usedCount} item
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 4: MASTER DATA PELANGGAN
      ======================================================= */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Master Data Pelanggan, Kontraktor & Toko Rekanan ({filteredCustomers.length} Pelanggan)
              </h3>
              <p className="text-xs text-slate-500">
                Kelola data pembeli, tipe pelanggan, dan batas limit plafon hutang tempo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCustomerModal()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pelanggan</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Nama Pelanggan</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">No. WhatsApp / HP</th>
                  <th className="py-3 px-3">Alamat / Lokasi Proyek</th>
                  <th className="py-3 px-3 text-right">Plafon Kredit</th>
                  <th className="py-3 px-3 text-right">Hutang Berjalan</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.type === 'Kontraktor'
                            ? 'bg-blue-100 text-blue-800'
                            : c.type === 'Proyek'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{c.address}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatRupiah(c.debtLimit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                      {formatRupiah(c.currentDebt)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.currentDebt > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.currentDebt > 0 ? 'Ada Piutang' : 'Lancar'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => openCustomerModal(c)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                        title="Edit Data Pelanggan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 5: MASTER DATA SUPPLIER / DISTRIBUTOR
      ======================================================= */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Master Data Supplier & Pabrik Distributor ({filteredSuppliers.length} Supplier)
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan distributor semen, baja beton, pasir tambang, cat pabrikan, dan rekening pembayaran.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSupplierModal()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Supplier</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Nama Distributor / Pabrik</th>
                  <th className="py-3 px-3">Kontak Person</th>
                  <th className="py-3 px-3">No. Telepon / WA</th>
                  <th className="py-3 px-3">Alamat Gudang Pabrik</th>
                  <th className="py-3 px-3">Info Rekening Transfer</th>
                  <th className="py-3 px-3 text-right">Sisa Hutang Dagang</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-3 text-slate-700">{s.contactPerson}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{s.phone}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{s.address}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{s.bankInfo || '-'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                      {formatRupiah(s.currentDebtToSupplier)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => openSupplierModal(s)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                        title="Edit Data Supplier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB 6: MASTER DATA PENGGUNA & KASIR (EDIT PROFIL ADMIN UTAMA)
      ======================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Admin Utama Header Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  Master Data Pengguna & Profil Akun ({users.length} Pengguna)
                </h3>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Wewenang Admin Utama Aktif
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Mode Lihat Saja
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Sebagai Admin Utama, Anda dapat mengedit nama, username login, kata sandi, PIN, dan hak akses seluruh akun.'
                  : 'Data profil pengguna dan hak akses sistem hanya dapat diubah oleh Admin Utama atau Pemilik Toko.'}
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => openUserModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
            )}
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className={`bg-white p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xs transition-all ${
                    isCurrent
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header card with Avatar & Role */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'cashier'
                                ? 'bg-blue-100 text-blue-800'
                                : u.role === 'warehouse'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                          {isCurrent && (
                            <span className="block text-[10px] font-bold text-emerald-700 mt-0.5">
                              ✓ Akun Aktif
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">{u.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">Username: @{u.username}</p>
                      {u.phone && <p className="text-[11px] text-slate-500 mt-0.5">WA/HP: {u.phone}</p>}
                      {u.email && <p className="text-[11px] text-slate-500 truncate">Email: {u.email}</p>}
                    </div>
                  </div>

                  {/* Profile Credentials details */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Peran Jabatan:</span>
                      <strong className="text-slate-800">{u.roleLabel}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Password:</span>
                      <strong className="font-mono text-slate-800">
                        {u.password ? '••••' : `•••• (${u.pin})`}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>PIN Akses:</span>
                      <strong className="font-mono text-slate-800">{u.pin}</strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openUserModal(u)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Profil</span>
                        </button>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Yakin ingin menghapus pengguna "${u.name}"?`)) {
                                deleteUser(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic flex items-center gap-1 w-full justify-center">
                        <Lock className="w-3 h-3" /> Hanya Admin Utama yang dapat mengedit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: ADD/EDIT MATERIAL
      ======================================================= */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingMaterial ? 'Edit Data Master Material' : 'Tambah Master Material Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Barang:</label>
                  <input
                    type="text"
                    required
                    value={formMatCode}
                    onChange={(e) => setFormMatCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Barcode:</label>
                  <input
                    type="text"
                    value={formMatBarcode}
                    onChange={(e) => setFormMatBarcode(e.target.value)}
                    placeholder="Scan / Ketik nomor barcode"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Material Bangunan:</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Semen Tiga Roda 40 Kg, Besi Beton 10mm SNI..."
                  value={formMatName}
                  onChange={(e) => setFormMatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Material:</label>
                  <select
                    value={formMatCategory}
                    onChange={(e) => setFormMatCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {customCategories.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Satuan Utama:</label>
                  <select
                    value={formMatBaseUnit}
                    onChange={(e) => setFormMatBaseUnit(e.target.value as StandardUnit)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {STANDARD_UNITS.map((u, i) => (
                      <option key={i} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Beli HPP (Modal):</label>
                  <input
                    type="number"
                    required
                    value={formMatBuyPrice}
                    onChange={(e) => setFormMatBuyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Jual Eceran:</label>
                  <input
                    type="number"
                    required
                    value={formMatSellPrice}
                    onChange={(e) => setFormMatSellPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Grosir:</label>
                  <input
                    type="number"
                    value={formMatWholesalePrice}
                    onChange={(e) => setFormMatWholesalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stok Awal Gudang:</label>
                  <input
                    type="number"
                    required
                    value={formMatStock}
                    onChange={(e) => setFormMatStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Batas Min. Stok:</label>
                  <input
                    type="number"
                    value={formMatMinStock}
                    onChange={(e) => setFormMatMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Rak / Gudang:</label>
                  <input
                    type="text"
                    value={formMatLocation}
                    onChange={(e) => setFormMatLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  Simpan Master Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: ADD CATEGORY
      ======================================================= */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Tambah Kategori Material Baru</h4>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kategori:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sanitari & Aksesoris Kamar Mandi"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: ADD UNIT
      ======================================================= */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Tambah Satuan Bahan Bangunan</h4>
              <button
                type="button"
                onClick={() => setShowAddUnitModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddUnit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Satuan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sak, Truk, Dus, Bal, Bundle..."
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Satuan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Kemasan Pabrik / Volume / Berat"
                  value={newUnitType}
                  onChange={(e) => setNewUnitType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Penggunaan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Digunakan untuk semen cor instan atau agregat"
                  value={newUnitDesc}
                  onChange={(e) => setNewUnitDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Simpan Satuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: ADD/EDIT CUSTOMER
      ======================================================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'Edit Master Pelanggan' : 'Tambah Pelanggan Baru'}
              </h4>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Pelanggan / Proyek:</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp / HP:</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipe Pelanggan:</label>
                <select
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="Kontraktor">Kontraktor</option>
                  <option value="Proyek">Proyek</option>
                  <option value="Langganan">Langganan Toko</option>
                  <option value="Umum">Umum (Eceran)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat / Lokasi Pengiriman:</label>
                <textarea
                  rows={2}
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Batas Plafon Hutang (Rp):</label>
                <input
                  type="number"
                  value={custDebtLimit}
                  onChange={(e) => setCustDebtLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: ADD/EDIT SUPPLIER
      ======================================================= */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                {editingSupplier ? 'Edit Master Supplier' : 'Tambah Supplier / Distributor Baru'}
              </h4>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Distributor / Pabrik:</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kontak Person (PIC):</label>
                <input
                  type="text"
                  required
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon / WA:</label>
                <input
                  type="text"
                  required
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Gudang Pabrik:</label>
                <textarea
                  rows={2}
                  value={supAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Info Rekening Transfer Pembayaran:</label>
                <input
                  type="text"
                  placeholder="Misal: BCA 8820123456 a/n PT Semen Tiga Roda"
                  value={supBank}
                  onChange={(e) => setSupBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL: ADD/EDIT USER PROFIL (KHUSUS ADMIN UTAMA)
      ======================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs my-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {editingUser ? 'Edit Profil Pengguna & Hak Akses' : 'Tambah Akun Pengguna Baru'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Wewenang Admin Utama: Kelola kredensial login & wewenang sistem
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              {/* Name and Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Siti Rahma, S.E."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Username Login <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="kasir1 / admin..."
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Password and PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Password / Kata Sandi <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? 'text' : 'password'}
                      required
                      placeholder="Masukkan password..."
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700"
                    >
                      {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    PIN Cepat Kasir (4 Digit):
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={userPin}
                    onChange={(e) => setUserPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Role & Role Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Hak Akses / Peran Sistem <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => {
                      const r = e.target.value as Role;
                      setUserRole(r);
                      const defaultLabels: Record<Role, string> = {
                        admin: 'Admin Utama',
                        owner: 'Pemilik Toko',
                        cashier: 'Kasir POS',
                        warehouse: 'Kepala Gudang',
                      };
                      setUserRoleLabel(defaultLabels[r]);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    <option value="admin">Admin Utama (Akses Penuh Sistem)</option>
                    <option value="owner">Pemilik Toko (Laporan & Finansial)</option>
                    <option value="cashier">Kasir POS (Penjualan & Kasir)</option>
                    <option value="warehouse">Kepala Gudang (Stok & Pembelian)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Label Jabatan / Peran:
                  </label>
                  <input
                    type="text"
                    value={userRoleLabel}
                    onChange={(e) => setUserRoleLabel(e.target.value)}
                    placeholder="Contoh: Kasir Shift Pagi / Koordinator Logistik"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nomor WhatsApp / HP:
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Alamat Email:
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  URL Foto Profil / Avatar (Opsional):
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={userAvatarUrl}
                  onChange={(e) => setUserAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Simpan Profil Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
