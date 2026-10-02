import {
  MySqlConfigState,
  MaterialItem,
  Customer,
  Supplier,
  Transaction,
  StoreSettings,
} from '../types';

export const DEFAULT_MYSQL_CONFIG: MySqlConfigState = {
  enabled: false,
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'kasir_db',
  autoSync: true,
  status: 'disconnected',
};

export interface MySqlTestResult {
  success: boolean;
  message: string;
  version?: string;
  database?: string;
  tables?: string[];
  isLocalhostWarning?: boolean;
}

export interface MySqlSyncResult {
  success: boolean;
  message: string;
  syncedCounts?: {
    products: number;
    customers: number;
    suppliers: number;
    transactions: number;
  };
}

/**
 * Test connection to MySQL Localhost through backend /api/mysql/test
 */
export async function testMySqlConnection(
  config: MySqlConfigState
): Promise<MySqlTestResult> {
  try {
    const res = await fetch('/api/mysql/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: config.host || 'localhost',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || 'kasir_db',
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error testing MySQL connection:', err);
    return {
      success: false,
      message:
        'Gagal memanggil endpoint backend /api/mysql/test: ' +
        (err.message || 'Koneksi jaringan terputus'),
    };
  }
}

/**
 * Initialize MySQL database and tables automatically
 */
export async function initMySqlTables(
  config: MySqlConfigState
): Promise<{ success: boolean; message: string; tables?: string[] }> {
  try {
    const res = await fetch('/api/mysql/init-tables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: config.host || 'localhost',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || 'kasir_db',
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error initializing MySQL tables:', err);
    return {
      success: false,
      message: 'Gagal inisialisasi tabel MySQL: ' + (err.message || 'Unknown error'),
    };
  }
}

/**
 * Sync all current app data (products, customers, suppliers, transactions, settings) to MySQL
 */
export async function syncAllToMySql(
  config: MySqlConfigState,
  data: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    settings: StoreSettings;
  }
): Promise<MySqlSyncResult> {
  try {
    const res = await fetch('/api/mysql/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          host: config.host || 'localhost',
          port: Number(config.port) || 3306,
          user: config.user || 'root',
          password: config.password || '',
          database: config.database || 'kasir_db',
        },
        data: {
          materials: data.materials,
          customers: data.customers,
          suppliers: data.suppliers,
          transactions: data.transactions,
          settings: data.settings,
        },
      }),
    });

    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error('Error syncing to MySQL:', err);
    return {
      success: false,
      message: 'Gagal sinkronisasi ke MySQL: ' + (err.message || 'Network error'),
    };
  }
}

/**
 * Pull all data from MySQL Localhost to app
 */
export async function pullFromMySql(
  config: MySqlConfigState
): Promise<{
  success: boolean;
  message: string;
  data?: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    settings?: Partial<StoreSettings>;
  };
}> {
  try {
    const res = await fetch('/api/mysql/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: config.host || 'localhost',
        port: Number(config.port) || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || 'kasir_db',
      }),
    });

    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error('Error pulling from MySQL:', err);
    return {
      success: false,
      message: 'Gagal mengambil data dari MySQL: ' + (err.message || 'Network error'),
    };
  }
}

/**
 * Execute custom SQL query (e.g. SELECT, SHOW TABLES)
 */
export async function executeCustomSqlQuery(
  config: MySqlConfigState,
  sql: string
): Promise<{ success: boolean; message: string; rows?: any[]; fields?: string[] }> {
  try {
    const res = await fetch('/api/mysql/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          host: config.host || 'localhost',
          port: Number(config.port) || 3306,
          user: config.user || 'root',
          password: config.password || '',
          database: config.database || 'kasir_db',
        },
        sql,
      }),
    });

    const result = await res.json();
    return result;
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal mengeksekusi query: ' + (err.message || 'Network error'),
    };
  }
}

/**
 * Generate full MySQL Schema DDL (.sql) for manual import in phpMyAdmin or command line
 */
export function generateMySqlSchemaSql(dbName: string = 'kasir_db'): string {
  const safeDb = dbName.replace(/[^a-zA-Z0-9_]/g, '') || 'kasir_db';
  return `-- ====================================================================
-- SKEMA DATABASE MYSQL LOCALHOST - APLIKASI KASIR POS TOKO BANGUNAN
-- Dibuat otomatis untuk XAMPP / Laragon / WampServer / Docker MySQL
-- Database: \`${safeDb}\`
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- 1. Buat Database jika belum ada
CREATE DATABASE IF NOT EXISTS \`${safeDb}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${safeDb}\`;

-- 2. Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS \`kategori\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`nama\` VARCHAR(100) NOT NULL,
  \`deskripsi\` TEXT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Pelanggan (Customer)
CREATE TABLE IF NOT EXISTS \`pelanggan\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`nama\` VARCHAR(150) NOT NULL,
  \`telepon\` VARCHAR(50) DEFAULT '',
  \`alamat\` TEXT NULL,
  \`tipe\` ENUM('Umum', 'Langganan', 'Kontraktor', 'Proyek') DEFAULT 'Umum',
  \`limit_hutang\` DECIMAL(15,2) DEFAULT 0,
  \`hutang_saat_ini\` DECIMAL(15,2) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_pelanggan_nama\` (\`nama\`),
  INDEX \`idx_pelanggan_telepon\` (\`telepon\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Supplier / Pemasok
CREATE TABLE IF NOT EXISTS \`supplier\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`nama\` VARCHAR(150) NOT NULL,
  \`telepon\` VARCHAR(50) DEFAULT '',
  \`alamat\` TEXT NULL,
  \`kontak_person\` VARCHAR(100) DEFAULT '',
  \`hutang_ke_supplier\` DECIMAL(15,2) DEFAULT 0,
  \`info_bank\` TEXT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Produk / Barang Bangunan
CREATE TABLE IF NOT EXISTS \`produk\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`kode\` VARCHAR(50) NOT NULL,
  \`barcode\` VARCHAR(100) DEFAULT '',
  \`nama\` VARCHAR(200) NOT NULL,
  \`kategori\` VARCHAR(100) NOT NULL,
  \`satuan_dasar\` VARCHAR(30) NOT NULL DEFAULT 'PCS',
  \`harga_beli\` DECIMAL(15,2) NOT NULL DEFAULT 0,
  \`harga_jual\` DECIMAL(15,2) NOT NULL DEFAULT 0,
  \`harga_grosir\` DECIMAL(15,2) DEFAULT 0,
  \`min_qty_grosir\` INT DEFAULT 1,
  \`stok\` DECIMAL(12,2) NOT NULL DEFAULT 0,
  \`min_stok\` DECIMAL(12,2) DEFAULT 5,
  \`lokasi_rak\` VARCHAR(100) DEFAULT '',
  \`gambar_url\` TEXT NULL,
  \`konversi_satuan_json\` JSON NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_kode\` (\`kode\`),
  INDEX \`idx_barcode\` (\`barcode\`),
  INDEX \`idx_nama\` (\`nama\`),
  INDEX \`idx_kategori\` (\`kategori\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Transaksi Penjualan Kasir
CREATE TABLE IF NOT EXISTS \`transaksi\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`invoice_no\` VARCHAR(50) NOT NULL,
  \`tanggal\` DATETIME NOT NULL,
  \`kasir_id\` VARCHAR(50) NOT NULL,
  \`kasir_nama\` VARCHAR(100) NOT NULL,
  \`pelanggan_id\` VARCHAR(50) NULL,
  \`pelanggan_nama\` VARCHAR(150) NOT NULL DEFAULT 'Pelanggan Umum',
  \`subtotal\` DECIMAL(15,2) NOT NULL DEFAULT 0,
  \`diskon_total\` DECIMAL(15,2) DEFAULT 0,
  \`pajak_persen\` DECIMAL(5,2) DEFAULT 0,
  \`pajak_total\` DECIMAL(15,2) DEFAULT 0,
  \`grand_total\` DECIMAL(15,2) NOT NULL DEFAULT 0,
  \`metode_pembayaran\` VARCHAR(30) NOT NULL DEFAULT 'Tunai',
  \`nama_bank\` VARCHAR(50) NULL,
  \`jumlah_bayar\` DECIMAL(15,2) NOT NULL DEFAULT 0,
  \`kembalian\` DECIMAL(15,2) NOT NULL DEFAULT 0,
  \`is_hutang\` TINYINT(1) DEFAULT 0,
  \`jatuh_tempo\` DATE NULL,
  \`sisa_hutang\` DECIMAL(15,2) DEFAULT 0,
  \`status_hutang\` VARCHAR(20) DEFAULT 'Lunas',
  \`catatan\` TEXT NULL,
  \`driver_pengiriman\` VARCHAR(100) NULL,
  \`plat_kendaraan\` VARCHAR(30) NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_invoice\` (\`invoice_no\`),
  INDEX \`idx_tanggal\` (\`tanggal\`),
  INDEX \`idx_pelanggan_id\` (\`pelanggan_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Item Transaksi Detail
CREATE TABLE IF NOT EXISTS \`item_transaksi\` (
  \`id\` INT AUTO_INCREMENT NOT NULL,
  \`transaksi_id\` VARCHAR(50) NOT NULL,
  \`material_id\` VARCHAR(50) NOT NULL,
  \`kode_barang\` VARCHAR(50) NOT NULL,
  \`nama_barang\` VARCHAR(200) NOT NULL,
  \`satuan\` VARCHAR(30) NOT NULL,
  \`qty\` DECIMAL(12,2) NOT NULL,
  \`faktor_konversi\` DECIMAL(10,4) DEFAULT 1,
  \`base_qty\` DECIMAL(12,2) NOT NULL,
  \`harga_beli\` DECIMAL(15,2) DEFAULT 0,
  \`harga_satuan\` DECIMAL(15,2) NOT NULL,
  \`diskon\` DECIMAL(15,2) DEFAULT 0,
  \`subtotal\` DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_transaksi_id\` (\`transaksi_id\`),
  INDEX \`idx_material_id\` (\`material_id\`),
  CONSTRAINT \`fk_item_transaksi\` FOREIGN KEY (\`transaksi_id\`) REFERENCES \`transaksi\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Mutasi Stok / Kartu Stok
CREATE TABLE IF NOT EXISTS \`mutasi_stok\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`tanggal\` DATETIME NOT NULL,
  \`material_id\` VARCHAR(50) NOT NULL,
  \`material_nama\` VARCHAR(200) NOT NULL,
  \`tipe\` VARCHAR(30) NOT NULL,
  \`qty_perubahan\` DECIMAL(12,2) NOT NULL,
  \`satuan\` VARCHAR(30) NOT NULL,
  \`stok_sebelum\` DECIMAL(12,2) NOT NULL,
  \`stok_sesudah\` DECIMAL(12,2) NOT NULL,
  \`catatan\` TEXT NULL,
  \`no_referensi\` VARCHAR(50) NULL,
  \`operator\` VARCHAR(100) NOT NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_mutasi_material\` (\`material_id\`),
  INDEX \`idx_mutasi_tanggal\` (\`tanggal\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel Pengaturan Toko & Metadata
CREATE TABLE IF NOT EXISTS \`pengaturan\` (
  \`kunci\` VARCHAR(100) NOT NULL,
  \`nilai\` LONGTEXT NOT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`kunci\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
`;
}

/**
 * Generate full SQL Data Dump (.sql) with INSERT statements
 */
export function generateMySqlDataDumpSql(
  data: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    settings: StoreSettings;
  },
  dbName: string = 'kasir_db'
): string {
  const schema = generateMySqlSchemaSql(dbName);
  const safeDb = dbName.replace(/[^a-zA-Z0-9_]/g, '') || 'kasir_db';

  function escapeSql(str: any): string {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return String(str);
    if (typeof str === 'boolean') return str ? '1' : '0';
    return (
      "'" +
      String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r') +
      "'"
    );
  }

  let sql = schema + `\nUSE \`${safeDb}\`;\n\n`;

  // Insert Customers
  if (data.customers && data.customers.length > 0) {
    sql += `-- Data Pelanggan (${data.customers.length} data)\n`;
    sql += `INSERT INTO \`pelanggan\` (\`id\`, \`nama\`, \`telepon\`, \`alamat\`, \`tipe\`, \`limit_hutang\`, \`hutang_saat_ini\`, \`created_at\`) VALUES\n`;
    const customerValues = data.customers.map((c) => {
      return `(${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.phone)}, ${escapeSql(
        c.address
      )}, ${escapeSql(c.type || 'Umum')}, ${Number(c.debtLimit) || 0}, ${
        Number(c.currentDebt) || 0
      }, ${escapeSql(c.createdAt || new Date().toISOString())})`;
    });
    sql += customerValues.join(',\n') + ' ON DUPLICATE KEY UPDATE `nama`=VALUES(`nama`);\n\n';
  }

  // Insert Suppliers
  if (data.suppliers && data.suppliers.length > 0) {
    sql += `-- Data Supplier (${data.suppliers.length} data)\n`;
    sql += `INSERT INTO \`supplier\` (\`id\`, \`nama\`, \`telepon\`, \`alamat\`, \`kontak_person\`, \`hutang_ke_supplier\`, \`info_bank\`) VALUES\n`;
    const supplierValues = data.suppliers.map((s) => {
      return `(${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.phone)}, ${escapeSql(
        s.address
      )}, ${escapeSql(s.contactPerson)}, ${Number(s.currentDebtToSupplier) || 0}, ${escapeSql(
        s.bankInfo || ''
      )})`;
    });
    sql += supplierValues.join(',\n') + ' ON DUPLICATE KEY UPDATE `nama`=VALUES(`nama`);\n\n';
  }

  // Insert Products
  if (data.materials && data.materials.length > 0) {
    sql += `-- Data Produk Bangunan (${data.materials.length} produk)\n`;
    sql += `INSERT INTO \`produk\` (\`id\`, \`kode\`, \`barcode\`, \`nama\`, \`kategori\`, \`satuan_dasar\`, \`harga_beli\`, \`harga_jual\`, \`harga_grosir\`, \`min_qty_grosir\`, \`stok\`, \`min_stok\`, \`lokasi_rak\`, \`gambar_url\`, \`konversi_satuan_json\`) VALUES\n`;
    const prodValues = data.materials.map((m) => {
      return `(${escapeSql(m.id)}, ${escapeSql(m.code)}, ${escapeSql(m.barcode || '')}, ${escapeSql(
        m.name
      )}, ${escapeSql(m.category)}, ${escapeSql(m.baseUnit)}, ${Number(m.buyPrice) || 0}, ${
        Number(m.sellPrice) || 0
      }, ${Number(m.wholesalePrice) || 0}, ${Number(m.wholesaleMinQty) || 1}, ${
        Number(m.stock) || 0
      }, ${Number(m.minStock) || 0}, ${escapeSql(m.location || '')}, ${escapeSql(
        m.imageUrl || ''
      )}, ${escapeSql(JSON.stringify(m.conversions || []))})`;
    });
    sql += prodValues.join(',\n') + ' ON DUPLICATE KEY UPDATE `nama`=VALUES(`nama`), `stok`=VALUES(`stok`), `harga_jual`=VALUES(`harga_jual`);\n\n';
  }

  // Insert Store Settings
  if (data.settings) {
    sql += `-- Pengaturan Toko\n`;
    sql += `INSERT INTO \`pengaturan\` (\`kunci\`, \`nilai\`) VALUES ('store_settings', ${escapeSql(
      JSON.stringify(data.settings)
    )}) ON DUPLICATE KEY UPDATE \`nilai\`=VALUES(\`nilai\`);\n\n`;
  }

  return sql;
}

/**
 * Trigger download of a SQL file in browser
 */
export function downloadSqlFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a standalone PHP script for users running XAMPP / Laragon
 * Can be placed in htdocs/pos_bridge.php for direct REST-to-MySQL
 */
export function generatePhpBridgeScript(config: MySqlConfigState): string {
  const host = config.host || 'localhost';
  const user = config.user || 'root';
  const pass = config.password || '';
  const db = config.database || 'kasir_db';

  return `<?php
/**
 * POS TOKO BANGUNAN - PHP & MYSQL LOCALHOST BRIDGE
 * Letakkan file ini di folder htdocs XAMPP Anda (misal: C:\\xampp\\htdocs\\pos_bridge.php)
 * URL Akses: http://localhost/pos_bridge.php
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = '${host}';
$user = '${user}';
$pass = '${pass}';
$db   = '${db}';

$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal koneksi MySQL: ' . $conn->connect_error
    ]);
    exit;
}

// Pastikan DB ada
$conn->query("CREATE DATABASE IF NOT EXISTS \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($db);

$action = $_GET['action'] ?? 'status';

if ($action === 'status') {
    echo json_encode([
        'success' => true,
        'message' => 'PHP MySQL Bridge Aktif & Terhubung!',
        'mysql_version' => $conn->server_info,
        'database' => $db
    ]);
} elseif ($action === 'query') {
    $input = json_decode(file_get_contents('php://input'), true);
    $sql = $input['sql'] ?? '';
    if (!$sql) {
        echo json_encode(['success' => false, 'message' => 'SQL query kosong']);
        exit;
    }
    $result = $conn->query($sql);
    if ($result === false) {
        echo json_encode(['success' => false, 'message' => $conn->error]);
    } else {
        $rows = [];
        if ($result instanceof mysqli_result) {
            while ($r = $result->fetch_assoc()) {
                $rows[] = $r;
            }
        }
        echo json_encode(['success' => true, 'rows' => $rows, 'affected_rows' => $conn->affected_rows]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Aksi tidak dikenali']);
}

$conn->close();
`;
}
