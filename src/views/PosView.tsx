import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  MaterialItem,
  StandardUnit,
  CartItem,
  TransactionItem,
  PaymentMethod,
  Customer,
} from '../types';
import { formatRupiah, formatNumber } from '../utils/formatter';
import { calculateBaseQuantity, getUnitPrice } from '../utils/conversion';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Search,
  ScanBarcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  Truck,
  User,
  Percent,
  X,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const PosView: React.FC = () => {
  const {
    materials,
    customers,
    currentUser,
    settings,
    recordTransaction,
    playBeep,
  } = useApp();

  // Search and Category
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('Pelanggan Umum');
  const [orderDiscount, setOrderDiscount] = useState<number>(0); // Rp discount on total order

  // Checkout Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [selectedBank, setSelectedBank] = useState<string>(settings.bankAccounts[0]?.bank || 'BCA');
  const [debtDueDate, setDebtDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 14 hari tempo
    return d.toISOString().split('T')[0];
  });
  const [debtDownPayment, setDebtDownPayment] = useState<number>(0);
  const [deliveryDriver, setDeliveryDriver] = useState<string>('');
  const [deliveryPlate, setDeliveryPlate] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Post-checkout receipt modal
  const [completedTx, setCompletedTx] = useState<any | null>(null);

  // Categories list derived from catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => set.add(m.category));
    return ['Semua', ...Array.from(set)];
  }, [materials]);

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
      return matchCat && matchSearch;
    });
  }, [materials, selectedCategory, searchTerm]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Add item to cart
  const addToCart = (material: MaterialItem) => {
    if (material.stock <= 0) {
      alert(`Stok ${material.name} habis!`);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.material.id === material.id && c.selectedUnit === material.baseUnit
      );

      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        const newQty = item.qty + 1;
        const priceInfo = getUnitPrice(material, item.selectedUnit, newQty);
        const updated = [...prev];
        updated[existingIdx] = {
          ...item,
          qty: newQty,
          pricePerUnit: priceInfo.price,
          isWholesaleApplied: priceInfo.isWholesale,
        };
        return updated;
      }

      // New cart item
      const priceInfo = getUnitPrice(material, material.baseUnit, 1);
      const newCartItem: CartItem = {
        cartId: `${material.id}-${material.baseUnit}-${Date.now()}`,
        material,
        selectedUnit: material.baseUnit,
        factorToBase: 1,
        qty: 1,
        pricePerUnit: priceInfo.price,
        discountAmount: 0,
        discountPercent: 0,
        isWholesaleApplied: priceInfo.isWholesale,
      };
      return [...prev, newCartItem];
    });

    playBeep();
  };

  // Update item quantity
  const updateQty = (cartId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = Math.max(0, item.qty + delta);
            if (newQty === 0) return null;

            const priceInfo = getUnitPrice(item.material, item.selectedUnit, newQty);
            return {
              ...item,
              qty: newQty,
              pricePerUnit: priceInfo.price,
              isWholesaleApplied: priceInfo.isWholesale,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Direct quantity input
  const setQtyDirect = (cartId: string, val: number) => {
    const qty = Math.max(0.1, val || 0);
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          const priceInfo = getUnitPrice(item.material, item.selectedUnit, qty);
          return {
            ...item,
            qty,
            pricePerUnit: priceInfo.price,
            isWholesaleApplied: priceInfo.isWholesale,
          };
        }
        return item;
      })
    );
  };

  // Change selected unit for item in cart
  const changeUnit = (cartId: string, newUnit: StandardUnit) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          let factor = 1;
          if (newUnit !== item.material.baseUnit) {
            const c = item.material.conversions.find((conv) => conv.unit === newUnit);
            if (c) factor = c.factorToBase;
          }
          const priceInfo = getUnitPrice(item.material, newUnit, item.qty);
          return {
            ...item,
            selectedUnit: newUnit,
            factorToBase: factor,
            pricePerUnit: priceInfo.price,
            isWholesaleApplied: priceInfo.isWholesale,
          };
        }
        return item;
      })
    );
  };

  // Update item discount
  const setItemDiscount = (cartId: string, discRp: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          return { ...item, discountAmount: Math.max(0, discRp) };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setOrderDiscount(0);
  };

  // Computations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const lineTotal = item.qty * item.pricePerUnit - item.discountAmount;
      return sum + Math.max(0, lineTotal);
    }, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    if (!settings.taxEnabled) return 0;
    const taxable = Math.max(0, subtotal - orderDiscount);
    return (taxable * settings.taxPercent) / 100;
  }, [subtotal, orderDiscount, settings.taxEnabled, settings.taxPercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - orderDiscount + taxAmount);
  }, [subtotal, orderDiscount, taxAmount]);

  // Open Checkout Modal
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setCashGiven(grandTotal); // default to exact amount
    setDebtDownPayment(0);
    setIsPaymentOpen(true);
  };

  // Submit checkout transaction
  const handleConfirmCheckout = () => {
    if (cart.length === 0) return;

    // Check credit limit if payment is Hutang
    if (paymentMethod === 'Hutang') {
      if (!selectedCustomerId) {
        alert('Mohon pilih data Pelanggan terlebih dahulu untuk transaksi Hutang / Tempo!');
        return;
      }
      if (activeCustomer) {
        const potentialDebt = activeCustomer.currentDebt + (grandTotal - debtDownPayment);
        if (potentialDebt > activeCustomer.debtLimit) {
          const confirmOver = window.confirm(
            `PERINGATAN: Hutang pelanggan (${formatRupiah(potentialDebt)}) akan melebihi Plafon Kredit (${formatRupiah(
              activeCustomer.debtLimit
            )}). Tetap lanjutkan?`
          );
          if (!confirmOver) return;
        }
      }
    }

    const txItems: TransactionItem[] = cart.map((item) => {
      const baseQty = calculateBaseQuantity(item.material, item.selectedUnit, item.qty);
      const lineSubtotal = Math.max(0, item.qty * item.pricePerUnit - item.discountAmount);
      return {
        materialId: item.material.id,
        code: item.material.code,
        name: item.material.name,
        unit: item.selectedUnit,
        qty: item.qty,
        factorToBase: item.factorToBase,
        baseQty,
        buyPrice: item.material.buyPrice,
        unitPrice: item.pricePerUnit,
        discount: item.discountAmount,
        subtotal: lineSubtotal,
      };
    });

    const isDebt = paymentMethod === 'Hutang';
    const amountPaid = isDebt
      ? debtDownPayment
      : paymentMethod === 'Tunai'
      ? cashGiven
      : grandTotal;
    const change = !isDebt && paymentMethod === 'Tunai' ? Math.max(0, cashGiven - grandTotal) : 0;
    const debtRemaining = isDebt ? Math.max(0, grandTotal - debtDownPayment) : 0;

    const customerName = activeCustomer ? activeCustomer.name : customCustomerName;

    const newTx = recordTransaction({
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerId: activeCustomer ? activeCustomer.id : undefined,
      customerName,
      items: txItems,
      subtotal,
      discountTotal: orderDiscount,
      taxPercent: settings.taxEnabled ? settings.taxPercent : 0,
      taxAmount,
      grandTotal,
      paymentMethod,
      bankName: paymentMethod === 'Transfer' ? selectedBank : undefined,
      amountPaid,
      change,
      isDebt,
      debtDueDate: isDebt ? debtDueDate : undefined,
      debtRemaining,
      debtStatus: isDebt ? (debtRemaining === 0 ? 'Lunas' : 'Belum') : 'Lunas',
      notes: orderNotes,
      deliveryDriver: deliveryDriver || undefined,
      deliveryPlate: deliveryPlate || undefined,
    });

    // Close payment, clear cart, show receipt
    setIsPaymentOpen(false);
    clearCart();
    setDeliveryDriver('');
    setDeliveryPlate('');
    setOrderNotes('');
    setCompletedTx(newTx);
  };

  // Quick cash helper
  const handleQuickCash = (amount: number) => {
    setCashGiven(amount);
  };

  return (
    <div id="pos-cashier-screen" className="p-4 lg:p-6 space-y-4 max-w-[1700px] mx-auto">
      {/* Top Bar: Search, Category Tabs, Scan */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-pos"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama semen, besi beton, bata, pipa, cat, atau scan barcode..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <ScanBarcode className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 cursor-pointer" />
          )}
        </div>

        {/* Quick Scan Action / Hint */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Total Material: <strong className="text-slate-800">{filteredMaterials.length}</strong>
          </span>
          <button
            id="btn-scan-simulate"
            type="button"
            onClick={() => {
              // Pick random material to simulate barcode scanner gun
              const randomMat = materials[Math.floor(Math.random() * materials.length)];
              if (randomMat) addToCart(randomMat);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-600" />
            <span>Simulasi Scan Barcode</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Main Split: Catalog Grid on Left, Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Columns: Product Grid */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMaterials.map((mat) => {
              const isLowStock = mat.stock <= mat.minStock;
              const isOutOfStock = mat.stock <= 0;

              return (
                <div
                  id={`mat-card-${mat.code}`}
                  key={mat.id}
                  onClick={() => !isOutOfStock && addToCart(mat)}
                  className={`bg-white rounded-2xl border p-3 flex flex-col justify-between transition-all relative select-none ${
                    isOutOfStock
                      ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                      : 'border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer group active:scale-[0.98]'
                  }`}
                >
                  {/* Category & Stock Badges */}
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[110px]">
                      {mat.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {formatNumber(mat.stock)} {mat.baseUnit}
                    </span>
                  </div>

                  {/* Title & Code */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[10px] font-mono text-slate-400 block">{mat.code}</span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                      {mat.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">{mat.location}</p>
                  </div>

                  {/* Pricing & Wholesale Tag */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-black text-sm sm:text-base text-slate-900">
                        {formatRupiah(mat.sellPrice)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        /{mat.baseUnit}
                      </span>
                    </div>

                    {/* Wholesale hint */}
                    {mat.wholesalePrice > 0 && (
                      <div className="text-[10px] text-emerald-700 bg-emerald-50/70 p-1 rounded font-medium leading-tight">
                        Grosir: min {mat.wholesaleMinQty} {mat.baseUnit} @ {formatRupiah(mat.wholesalePrice)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMaterials.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Layers className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Material tidak ditemukan</p>
              <p className="text-xs">Coba ubah kata kunci pencarian atau kategori filter.</p>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Active POS Cart */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col sticky top-20">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                Keranjang Kasir ({cart.length} item)
              </h3>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {/* Customer Selector */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Pelanggan / Proyek:
              </label>
              {activeCustomer && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                  {activeCustomer.type}
                </span>
              )}
            </div>

            <select
              id="select-pos-customer"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Pelanggan Umum (Tanpa Akun)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Hutang: {formatRupiah(c.currentDebt)} / Limit: {formatRupiah(c.debtLimit)})
                </option>
              ))}
            </select>

            {/* If Customer is selected, show credit limit card */}
            {activeCustomer && (
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Plafon Kredit:</span>
                  <span
                    className={`font-bold ${
                      activeCustomer.debtLimit - activeCustomer.currentDebt < grandTotal
                        ? 'text-rose-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(Math.max(0, activeCustomer.debtLimit - activeCustomer.currentDebt))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Hutang Aktif:</span>
                  <span>{formatRupiah(activeCustomer.currentDebt)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 max-h-[360px] overflow-y-auto p-3 space-y-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Keranjang masih kosong</p>
                <p className="text-[11px]">Klik barang material di sebelah kiri untuk menambah ke kasir.</p>
              </div>
            ) : (
              cart.map((item) => {
                const availableUnits = [
                  item.material.baseUnit,
                  ...item.material.conversions.map((c) => c.unit),
                ];

                return (
                  <div key={item.cartId} className="pt-3 first:pt-0 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800 line-clamp-1">
                          {item.material.name}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span>{formatRupiah(item.pricePerUnit)}</span>
                          {item.isWholesaleApplied && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Harga Grosir
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartId)}
                        className="text-slate-300 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unit Selector & Quantity Modifier */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Unit Switcher */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Satuan:</span>
                        <select
                          value={item.selectedUnit}
                          onChange={(e) => changeUnit(item.cartId, e.target.value as StandardUnit)}
                          className="px-2 py-1 rounded-md border border-slate-300 text-xs font-bold bg-slate-50"
                        >
                          {availableUnits.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartId, -1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.qty}
                          onChange={(e) => setQtyDirect(item.cartId, parseFloat(e.target.value))}
                          className="w-14 px-1.5 py-0.5 rounded border border-slate-300 text-center font-bold text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartId, 1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Item Discount & Line Subtotal */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Diskon:</span>
                        <input
                          type="number"
                          placeholder="Rp"
                          value={item.discountAmount || ''}
                          onChange={(e) =>
                            setItemDiscount(item.cartId, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 px-1 py-0.5 rounded border border-slate-200 text-[10px] text-rose-600 font-semibold text-right"
                        />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">
                        {formatRupiah(item.qty * item.pricePerUnit - item.discountAmount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer: Totals & Checkout Button */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatRupiah(subtotal)}</span>
              </div>

              {/* Order discount input */}
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1 text-[11px]">
                  <Percent className="w-3 h-3 text-slate-400" />
                  Diskon Nota:
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 px-2 py-0.5 rounded border border-slate-300 text-xs text-rose-600 font-semibold text-right bg-white"
                />
              </div>

              {/* Tax */}
              {settings.taxEnabled && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>PPN ({settings.taxPercent}%):</span>
                  <span>{formatRupiah(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-extrabold text-sm sm:text-base text-slate-900">
                <span>GRAND TOTAL:</span>
                <span className="text-emerald-700">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              id="btn-pos-checkout"
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenPayment}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md ${
                cart.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.99]'
              }`}
            >
              <span>Bayar Transaksi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT & CHECKOUT MODAL */}
      {isPaymentOpen && (
        <div
          id="payment-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div
            id="payment-modal"
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-6 overflow-hidden flex flex-col border border-slate-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Pembayaran Kasir Material</h3>
                <p className="text-xs text-slate-500">
                  {cart.length} jenis material | Total tagihan: {formatRupiah(grandTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Grand Total Display */}
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Total Tagihan Bersih
                  </span>
                  <p className="text-xs text-slate-500">
                    Pelanggan: {activeCustomer ? activeCustomer.name : customCustomerName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-900">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Pilih Metode Pembayaran:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Tunai' as PaymentMethod, label: 'Tunai (Cash)', icon: Banknote },
                    { id: 'Transfer' as PaymentMethod, label: 'Transfer Bank', icon: CreditCard },
                    { id: 'QRIS' as PaymentMethod, label: 'QRIS Statis', icon: QrCode },
                    { id: 'Hutang' as PaymentMethod, label: 'Hutang / Tempo', icon: Calendar },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className="text-xs">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details per method */}
              {paymentMethod === 'Tunai' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Nominal Uang Diterima:</label>
                    <input
                      id="input-cash-given"
                      type="number"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-lg font-black text-slate-900 bg-white"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(grandTotal)}
                      className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 200000, 500000, 1000000].map((nominal) => {
                      if (nominal < grandTotal && nominal !== 500000 && nominal !== 1000000) return null;
                      return (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => handleQuickCash(nominal)}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {formatRupiah(nominal)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Change calculation */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-600">Kembalian:</span>
                    <span
                      className={`font-black text-lg ${
                        cashGiven < grandTotal ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {cashGiven < grandTotal
                        ? `Kurang ${formatRupiah(grandTotal - cashGiven)}`
                        : formatRupiah(cashGiven - grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'Transfer' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <label className="font-bold text-slate-700 block">Pilih Rekening Tujuan Toko:</label>
                  <div className="space-y-1.5">
                    {settings.bankAccounts.map((b, i) => (
                      <label
                        key={i}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer ${
                          selectedBank === b.bank
                            ? 'bg-white border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-white/60 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="bank_dest"
                            checked={selectedBank === b.bank}
                            onChange={() => setSelectedBank(b.bank)}
                            className="text-emerald-600"
                          />
                          <span className="font-bold text-slate-800">{b.bank}</span>
                        </div>
                        <span className="font-mono text-slate-600">
                          {b.accountNo} (a/n {b.accountHolder})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'QRIS' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs">
                    <QrCode className="w-28 h-28 text-slate-800" />
                  </div>
                  <p className="font-bold text-xs text-slate-800">Scan QRIS TB. MAJU JAYA MATERIAL</p>
                  <p className="text-[11px] text-slate-500">Mendukung GoPay, OVO, Dana, BCA, Mandiri, dll.</p>
                </div>
              )}

              {paymentMethod === 'Hutang' && (
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Pencatatan Penjualan Kredit / Piutang Material</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Tanggal Jatuh Tempo:</label>
                      <input
                        id="input-debt-due-date"
                        type="date"
                        value={debtDueDate}
                        onChange={(e) => setDebtDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Uang Muka / DP (Opsional):</label>
                      <input
                        id="input-debt-dp"
                        type="number"
                        placeholder="Rp 0"
                        value={debtDownPayment || ''}
                        onChange={(e) => setDebtDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-200/60 flex justify-between font-bold text-rose-900">
                    <span>Sisa Hutang yang Dicatat:</span>
                    <span>{formatRupiah(Math.max(0, grandTotal - debtDownPayment))}</span>
                  </div>
                </div>
              )}

              {/* Delivery Details & Drivers (Material store signature feature) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Info Pengiriman Material (Armada / Truk / Supir):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Supir (e.g. Pak Mamat)"
                    value={deliveryDriver}
                    onChange={(e) => setDeliveryDriver(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                  <input
                    type="text"
                    placeholder="No. Polisi Armada (e.g. B 9812 XYZ)"
                    value={deliveryPlate}
                    onChange={(e) => setDeliveryPlate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white uppercase font-mono"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Catatan Transaksi / Lokasi Penurunan Material..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                id="btn-submit-payment"
                type="button"
                disabled={paymentMethod === 'Tunai' && cashGiven < grandTotal}
                onClick={handleConfirmCheckout}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md ${
                  paymentMethod === 'Tunai' && cashGiven < grandTotal
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Selesaikan & Cetak Nota</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED RECEIPT MODAL */}
      {completedTx && (
        <ReceiptModal
          transaction={completedTx}
          settings={settings}
          onClose={() => setCompletedTx(null)}
        />
      )}
    </div>
  );
};
