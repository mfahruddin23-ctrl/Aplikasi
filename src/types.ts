export type Role = 'admin' | 'owner' | 'cashier' | 'warehouse';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  role: Role;
  roleLabel: string;
  pin: string;
  avatarUrl?: string;
}

export type StandardUnit =
  | 'PCS'
  | 'Sak'
  | 'Batang'
  | 'Meter'
  | 'Kubik'
  | 'Ton'
  | 'Lembar'
  | 'Dus'
  | 'Kg'
  | 'Liter'
  | 'Roll'
  | 'Kaleng'
  | 'Pail'
  | 'Colt';

export interface UnitConversionRule {
  unit: StandardUnit;
  factorToBase: number; // e.g. if base is Sak (40kg) and unit is Kg, factor is 0.025 (or 1 Sak = 40 Kg)
  price: number;
  wholesalePrice?: number;
}

export interface MaterialItem {
  id: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  baseUnit: StandardUnit;
  conversions: UnitConversionRule[];
  buyPrice: number; // Base unit cost
  sellPrice: number; // Base unit retail price
  wholesalePrice: number; // Base unit wholesale price
  wholesaleMinQty: number; // Min quantity in base unit to qualify for wholesale
  stock: number; // in baseUnit
  minStock: number;
  location: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: 'Umum' | 'Langganan' | 'Kontraktor' | 'Proyek';
  debtLimit: number;
  currentDebt: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  contactPerson: string;
  currentDebtToSupplier: number;
  bankInfo?: string;
}

export interface CartItem {
  cartId: string;
  material: MaterialItem;
  selectedUnit: StandardUnit;
  factorToBase: number;
  qty: number;
  pricePerUnit: number;
  discountAmount: number;
  discountPercent: number;
  isWholesaleApplied: boolean;
  notes?: string;
}

export interface TransactionItem {
  materialId: string;
  code: string;
  name: string;
  unit: StandardUnit;
  qty: number;
  factorToBase: number;
  baseQty: number;
  buyPrice: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export type PaymentMethod = 'Tunai' | 'Transfer' | 'QRIS' | 'Hutang';

export interface Transaction {
  id: string;
  invoiceNo: string;
  date: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName: string;
  items: TransactionItem[];
  subtotal: number;
  discountTotal: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  bankName?: string;
  amountPaid: number;
  change: number;
  isDebt: boolean;
  debtDueDate?: string;
  debtRemaining?: number;
  debtStatus?: 'Lunas' | 'Sebagian' | 'Belum';
  notes?: string;
  deliveryDriver?: string;
  deliveryPlate?: string;
}

export interface DebtPayment {
  id: string;
  transactionId: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  notes?: string;
}

export interface PurchaseItem {
  materialId: string;
  materialName: string;
  unit: StandardUnit;
  qty: number;
  buyPrice: number;
  subtotal: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  supplierInvoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentStatus: 'Lunas' | 'Hutang';
  amountPaid: number;
  debtRemaining: number;
  dueDate?: string;
  cashierName: string;
  notes?: string;
}

export type StockMovementType =
  | 'IN_PURCHASE'
  | 'OUT_SALE'
  | 'ADJUSTMENT_PLUS'
  | 'ADJUSTMENT_MINUS'
  | 'DAMAGED'
  | 'INITIAL';

export interface StockMovement {
  id: string;
  date: string;
  materialId: string;
  materialName: string;
  type: StockMovementType;
  qtyChange: number;
  unit: StandardUnit;
  previousStock: number;
  newStock: number;
  notes: string;
  refNo?: string;
  operator: string;
}

export type ThemeColor = 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'slate';

export interface GoogleSheetsConfig {
  enabled: boolean;
  spreadsheetId: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  autoSync: boolean;
  lastSync?: string;
  webhookUrl?: string;
  connectionMode?: 'simple' | 'oauth';
}

export interface FirebaseConfigState {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface SupabaseConfigState {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface MySqlConfigState {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  autoSync?: boolean;
  lastSync?: string;
  status?: 'connected' | 'disconnected' | 'error';
  bridgeUrl?: string;
}

export type DatabaseType = 'google_sheets' | 'mysql' | 'local';

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
  taxEnabled: boolean;
  taxPercent: number;
  thermalPaperSize: '58mm' | '80mm';
  themeColor?: ThemeColor;
  appLogoUrl?: string;
  companyLogoUrl?: string;
  bankAccounts: {
    bank: string;
    accountNo: string;
    accountHolder: string;
  }[];
  activeDatabaseType?: DatabaseType;
  googleSheetsConfig?: GoogleSheetsConfig;
  mysqlConfig?: MySqlConfigState;
  firebaseConfig?: FirebaseConfigState;
  supabaseConfig?: SupabaseConfigState;
}
