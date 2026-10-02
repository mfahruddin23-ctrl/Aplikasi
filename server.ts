import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to format friendly MySQL error messages in Indonesian
function formatMySqlError(err: any, host: string, port: number, user: string, database: string) {
  const code = err.code || '';
  const message = err.message || '';

  if (code === 'ECONNREFUSED') {
    return {
      success: false,
      message: `Tidak dapat terhubung ke MySQL pada ${host}:${port}. Pastikan service MySQL (XAMPP / Laragon / Docker) sudah AKTIF (Running).`,
      isLocalhostWarning: true,
      errorDetail: message,
    };
  }
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return {
      success: false,
      message: `Akses ditolak untuk user '${user}' pada host ${host}. Silakan periksa kembali username dan password MySQL Anda.`,
      errorDetail: message,
    };
  }
  if (code === 'ER_BAD_DB_ERROR') {
    return {
      success: false,
      message: `Database '${database}' belum ditemukan di MySQL Anda. Silakan klik tombol 'Inisialisasi Tabel Otomatis' untuk membuat database dan tabel secara otomatis.`,
      errorDetail: message,
    };
  }
  return {
    success: false,
    message: `Gagal koneksi MySQL: ${message} (Kode: ${code || 'UNKNOWN'})`,
    errorDetail: message,
  };
}

// 1. Test MySQL Connection Endpoint
app.post('/api/mysql/test', async (req: Request, res: Response) => {
  const { host = 'localhost', port = 3306, user = 'root', password = '', database = 'kasir_db' } = req.body;

  let connection;
  try {
    // First try connecting to MySQL server (without specifying DB in case it doesn't exist yet)
    connection = await mysql.createConnection({
      host,
      port: Number(port) || 3306,
      user,
      password,
      connectTimeout: 5000,
    });

    const [rows]: any = await connection.query('SELECT VERSION() as version, @@hostname as db_host');
    const version = rows?.[0]?.version || 'Unknown';
    const dbHost = rows?.[0]?.db_host || host;

    // Check if the requested database exists
    let dbExists = false;
    let tableNames: string[] = [];
    try {
      const [dbRows]: any = await connection.query(`SHOW DATABASES LIKE '${database.replace(/['\\]/g, '')}'`);
      if (Array.isArray(dbRows) && dbRows.length > 0) {
        dbExists = true;
        await connection.query(`USE \`${database.replace(/[`\\]/g, '')}\``);
        const [tables]: any = await connection.query('SHOW TABLES');
        tableNames = tables.map((t: any) => Object.values(t)[0] as string);
      }
    } catch {
      // Ignored if DB doesn't exist yet
    }

    await connection.end();

    return res.json({
      success: true,
      message: dbExists
        ? `Berhasil terhubung ke MySQL ${version} di ${dbHost}. Database '${database}' aktif dengan ${tableNames.length} tabel.`
        : `Berhasil terhubung ke MySQL Server ${version} di ${dbHost}. Catatan: Database '${database}' belum dibuat. Klik 'Inisialisasi Tabel Otomatis' untuk membuatnya!`,
      version,
      database,
      dbExists,
      tables: tableNames,
    });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
    const errInfo = formatMySqlError(err, host, Number(port), user, database);
    return res.status(200).json(errInfo);
  }
});

// 2. Initialize Database and Tables Automatically
app.post('/api/mysql/init-tables', async (req: Request, res: Response) => {
  const { host = 'localhost', port = 3306, user = 'root', password = '', database = 'kasir_db' } = req.body;
  const safeDb = database.replace(/[^a-zA-Z0-9_]/g, '') || 'kasir_db';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port) || 3306,
      user,
      password,
      connectTimeout: 5000,
      multipleStatements: true,
    });

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${safeDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${safeDb}\``);

    // Create Tables
    const initSql = `
      CREATE TABLE IF NOT EXISTS \`kategori\` (
        \`id\` VARCHAR(50) NOT NULL,
        \`nama\` VARCHAR(100) NOT NULL,
        \`deskripsi\` TEXT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`pelanggan\` (
        \`id\` VARCHAR(50) NOT NULL,
        \`nama\` VARCHAR(150) NOT NULL,
        \`telepon\` VARCHAR(50) DEFAULT '',
        \`alamat\` TEXT NULL,
        \`tipe\` ENUM('Umum', 'Langganan', 'Kontraktor', 'Proyek') DEFAULT 'Umum',
        \`limit_hutang\` DECIMAL(15,2) DEFAULT 0,
        \`hutang_saat_ini\` DECIMAL(15,2) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
        UNIQUE KEY \`uk_kode\` (\`kode\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
        UNIQUE KEY \`uk_invoice\` (\`invoice_no\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
        INDEX \`idx_transaksi_id\` (\`transaksi_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`pengaturan\` (
        \`kunci\` VARCHAR(100) NOT NULL,
        \`nilai\` LONGTEXT NOT NULL,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`kunci\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(initSql);

    const [tables]: any = await connection.query('SHOW TABLES');
    const tableList = tables.map((t: any) => Object.values(t)[0]);

    await connection.end();

    return res.json({
      success: true,
      message: `Database '${safeDb}' dan tabel kasir berhasil diinisialisasi!`,
      tables: tableList,
    });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
    const errInfo = formatMySqlError(err, host, Number(port), user, database);
    return res.status(200).json(errInfo);
  }
});

// 3. Sync Data to MySQL
app.post('/api/mysql/sync', async (req: Request, res: Response) => {
  const { config, data } = req.body;
  const { host = 'localhost', port = 3306, user = 'root', password = '', database = 'kasir_db' } = config || {};
  const safeDb = database.replace(/[^a-zA-Z0-9_]/g, '') || 'kasir_db';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port) || 3306,
      user,
      password,
      database: safeDb,
      connectTimeout: 5000,
    });

    let syncedProducts = 0;
    let syncedCustomers = 0;
    let syncedSuppliers = 0;
    let syncedTransactions = 0;

    // Sync Customers
    if (Array.isArray(data.customers)) {
      for (const c of data.customers) {
        await connection.query(
          `INSERT INTO \`pelanggan\` (\`id\`, \`nama\`, \`telepon\`, \`alamat\`, \`tipe\`, \`limit_hutang\`, \`hutang_saat_ini\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`nama\`=VALUES(\`nama\`),
             \`telepon\`=VALUES(\`telepon\`),
             \`alamat\`=VALUES(\`alamat\`),
             \`tipe\`=VALUES(\`tipe\`),
             \`limit_hutang\`=VALUES(\`limit_hutang\`),
             \`hutang_saat_ini\`=VALUES(\`hutang_saat_ini\`)`,
          [c.id, c.name, c.phone || '', c.address || '', c.type || 'Umum', Number(c.debtLimit) || 0, Number(c.currentDebt) || 0]
        );
        syncedCustomers++;
      }
    }

    // Sync Suppliers
    if (Array.isArray(data.suppliers)) {
      for (const s of data.suppliers) {
        await connection.query(
          `INSERT INTO \`supplier\` (\`id\`, \`nama\`, \`telepon\`, \`alamat\`, \`kontak_person\`, \`hutang_ke_supplier\`, \`info_bank\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`nama\`=VALUES(\`nama\`),
             \`telepon\`=VALUES(\`telepon\`),
             \`alamat\`=VALUES(\`alamat\`),
             \`kontak_person\`=VALUES(\`kontak_person\`),
             \`hutang_ke_supplier\`=VALUES(\`hutang_ke_supplier\`),
             \`info_bank\`=VALUES(\`info_bank\`)`,
          [s.id, s.name, s.phone || '', s.address || '', s.contactPerson || '', Number(s.currentDebtToSupplier) || 0, s.bankInfo || '']
        );
        syncedSuppliers++;
      }
    }

    // Sync Products
    if (Array.isArray(data.materials)) {
      for (const m of data.materials) {
        await connection.query(
          `INSERT INTO \`produk\` (\`id\`, \`kode\`, \`barcode\`, \`nama\`, \`kategori\`, \`satuan_dasar\`, \`harga_beli\`, \`harga_jual\`, \`harga_grosir\`, \`min_qty_grosir\`, \`stok\`, \`min_stok\`, \`lokasi_rak\`, \`gambar_url\`, \`konversi_satuan_json\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`nama\`=VALUES(\`nama\`),
             \`kategori\`=VALUES(\`kategori\`),
             \`satuan_dasar\`=VALUES(\`satuan_dasar\`),
             \`harga_beli\`=VALUES(\`harga_beli\`),
             \`harga_jual\`=VALUES(\`harga_jual\`),
             \`harga_grosir\`=VALUES(\`harga_grosir\`),
             \`min_qty_grosir\`=VALUES(\`min_qty_grosir\`),
             \`stok\`=VALUES(\`stok\`),
             \`min_stok\`=VALUES(\`min_stok\`),
             \`lokasi_rak\`=VALUES(\`lokasi_rak\`),
             \`gambar_url\`=VALUES(\`gambar_url\`),
             \`konversi_satuan_json\`=VALUES(\`konversi_satuan_json\`)`,
          [
            m.id,
            m.code,
            m.barcode || '',
            m.name,
            m.category,
            m.baseUnit,
            Number(m.buyPrice) || 0,
            Number(m.sellPrice) || 0,
            Number(m.wholesalePrice) || 0,
            Number(m.wholesaleMinQty) || 1,
            Number(m.stock) || 0,
            Number(m.minStock) || 0,
            m.location || '',
            m.imageUrl || '',
            JSON.stringify(m.conversions || []),
          ]
        );
        syncedProducts++;
      }
    }

    // Sync Transactions
    if (Array.isArray(data.transactions)) {
      for (const tx of data.transactions) {
        await connection.query(
          `INSERT INTO \`transaksi\` (\`id\`, \`invoice_no\`, \`tanggal\`, \`kasir_id\`, \`kasir_nama\`, \`pelanggan_id\`, \`pelanggan_nama\`, \`subtotal\`, \`diskon_total\`, \`pajak_persen\`, \`pajak_total\`, \`grand_total\`, \`metode_pembayaran\`, \`nama_bank\`, \`jumlah_bayar\`, \`kembalian\`, \`is_hutang\`, \`sisa_hutang\`, \`status_hutang\`, \`catatan\`, \`driver_pengiriman\`, \`plat_kendaraan\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             \`status_hutang\`=VALUES(\`status_hutang\`),
             \`sisa_hutang\`=VALUES(\`sisa_hutang\`)`,
          [
            tx.id,
            tx.invoiceNo,
            new Date(tx.date || Date.now()),
            tx.cashierId || 'C1',
            tx.cashierName || 'Kasir',
            tx.customerId || null,
            tx.customerName || 'Pelanggan Umum',
            Number(tx.subtotal) || 0,
            Number(tx.discountTotal) || 0,
            Number(tx.taxPercent) || 0,
            Number(tx.taxAmount) || 0,
            Number(tx.grandTotal) || 0,
            tx.paymentMethod || 'Tunai',
            tx.bankName || null,
            Number(tx.amountPaid) || 0,
            Number(tx.change) || 0,
            tx.isDebt ? 1 : 0,
            Number(tx.debtRemaining) || 0,
            tx.debtStatus || 'Lunas',
            tx.notes || null,
            tx.deliveryDriver || null,
            tx.deliveryPlate || null,
          ]
        );

        if (Array.isArray(tx.items)) {
          for (const it of tx.items) {
            await connection.query(
              `INSERT INTO \`item_transaksi\` (\`transaksi_id\`, \`material_id\`, \`kode_barang\`, \`nama_barang\`, \`satuan\`, \`qty\`, \`faktor_konversi\`, \`base_qty\`, \`harga_beli\`, \`harga_satuan\`, \`diskon\`, \`subtotal\`)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                tx.id,
                it.materialId,
                it.code || '',
                it.name || '',
                it.unit || 'PCS',
                Number(it.qty) || 1,
                Number(it.factorToBase) || 1,
                Number(it.baseQty) || Number(it.qty) || 1,
                Number(it.buyPrice) || 0,
                Number(it.unitPrice) || 0,
                Number(it.discount) || 0,
                Number(it.subtotal) || 0,
              ]
            );
          }
        }
        syncedTransactions++;
      }
    }

    // Save Settings
    if (data.settings) {
      await connection.query(
        `INSERT INTO \`pengaturan\` (\`kunci\`, \`nilai\`) VALUES ('store_settings', ?)
         ON DUPLICATE KEY UPDATE \`nilai\`=VALUES(\`nilai\`)`,
        [JSON.stringify(data.settings)]
      );
    }

    await connection.end();

    return res.json({
      success: true,
      message: `Sinkronisasi ke MySQL Localhost berhasil! (${syncedProducts} produk, ${syncedCustomers} pelanggan, ${syncedTransactions} transaksi tersimpan)`,
      syncedCounts: {
        products: syncedProducts,
        customers: syncedCustomers,
        suppliers: syncedSuppliers,
        transactions: syncedTransactions,
      },
    });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
    const errInfo = formatMySqlError(err, host, Number(port), user, database);
    return res.status(200).json(errInfo);
  }
});

// 4. Pull Data from MySQL
app.post('/api/mysql/pull', async (req: Request, res: Response) => {
  const { host = 'localhost', port = 3306, user = 'root', password = '', database = 'kasir_db' } = req.body;
  const safeDb = database.replace(/[^a-zA-Z0-9_]/g, '') || 'kasir_db';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port) || 3306,
      user,
      password,
      database: safeDb,
      connectTimeout: 5000,
    });

    const [prodRows]: any = await connection.query('SELECT * FROM `produk` ORDER BY `nama` ASC');
    const materials = prodRows.map((r: any) => ({
      id: r.id,
      code: r.kode,
      barcode: r.barcode || '',
      name: r.nama,
      category: r.kategori,
      baseUnit: r.satuan_dasar,
      buyPrice: Number(r.harga_beli) || 0,
      sellPrice: Number(r.harga_jual) || 0,
      wholesalePrice: Number(r.harga_grosir) || 0,
      wholesaleMinQty: Number(r.min_qty_grosir) || 1,
      stock: Number(r.stok) || 0,
      minStock: Number(r.min_stok) || 0,
      location: r.lokasi_rak || '',
      imageUrl: r.gambar_url || undefined,
      conversions: r.konversi_satuan_json ? (typeof r.konversi_satuan_json === 'string' ? JSON.parse(r.konversi_satuan_json) : r.konversi_satuan_json) : [],
    }));

    const [custRows]: any = await connection.query('SELECT * FROM `pelanggan` ORDER BY `nama` ASC');
    const customers = custRows.map((r: any) => ({
      id: r.id,
      name: r.nama,
      phone: r.telepon || '',
      address: r.alamat || '',
      type: r.tipe || 'Umum',
      debtLimit: Number(r.limit_hutang) || 0,
      currentDebt: Number(r.hutang_saat_ini) || 0,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    const [supRows]: any = await connection.query('SELECT * FROM `supplier` ORDER BY `nama` ASC');
    const suppliers = supRows.map((r: any) => ({
      id: r.id,
      name: r.nama,
      phone: r.telepon || '',
      address: r.alamat || '',
      contactPerson: r.kontak_person || '',
      currentDebtToSupplier: Number(r.hutang_ke_supplier) || 0,
      bankInfo: r.info_bank || '',
    }));

    const [txRows]: any = await connection.query('SELECT * FROM `transaksi` ORDER BY `tanggal` DESC LIMIT 100');
    const [itemRows]: any = await connection.query('SELECT * FROM `item_transaksi`');

    const transactions = txRows.map((tx: any) => {
      const items = itemRows
        .filter((it: any) => it.transaksi_id === tx.id)
        .map((it: any) => ({
          materialId: it.material_id,
          code: it.kode_barang,
          name: it.nama_barang,
          unit: it.satuan,
          qty: Number(it.qty) || 1,
          factorToBase: Number(it.faktor_konversi) || 1,
          baseQty: Number(it.base_qty) || 1,
          buyPrice: Number(it.harga_beli) || 0,
          unitPrice: Number(it.harga_satuan) || 0,
          discount: Number(it.diskon) || 0,
          subtotal: Number(it.subtotal) || 0,
        }));

      return {
        id: tx.id,
        invoiceNo: tx.invoice_no,
        date: tx.tanggal ? new Date(tx.tanggal).toISOString() : new Date().toISOString(),
        cashierId: tx.cashier_id,
        cashierName: tx.cashier_nama,
        customerId: tx.pelanggan_id || undefined,
        customerName: tx.pelanggan_nama || 'Pelanggan Umum',
        items,
        subtotal: Number(tx.subtotal) || 0,
        discountTotal: Number(tx.diskon_total) || 0,
        taxPercent: Number(tx.pajak_persen) || 0,
        taxAmount: Number(tx.pajak_total) || 0,
        grandTotal: Number(tx.grand_total) || 0,
        paymentMethod: tx.metode_pembayaran || 'Tunai',
        bankName: tx.nama_bank || undefined,
        amountPaid: Number(tx.jumlah_bayar) || 0,
        change: Number(tx.kembalian) || 0,
        isDebt: Boolean(tx.is_hutang),
        debtDueDate: tx.jatuh_tempo ? new Date(tx.jatuh_tempo).toISOString().split('T')[0] : undefined,
        debtRemaining: Number(tx.sisa_hutang) || 0,
        debtStatus: tx.status_hutang || 'Lunas',
        notes: tx.catatan || undefined,
        deliveryDriver: tx.driver_pengiriman || undefined,
        deliveryPlate: tx.plat_kendaraan || undefined,
      };
    });

    let settings = undefined;
    try {
      const [settingRows]: any = await connection.query("SELECT `nilai` FROM `pengaturan` WHERE `kunci` = 'store_settings'");
      if (settingRows && settingRows.length > 0 && settingRows[0].nilai) {
        settings = JSON.parse(settingRows[0].nilai);
      }
    } catch {
      // ignore
    }

    await connection.end();

    return res.json({
      success: true,
      message: `Berhasil mengambil data dari MySQL: ${materials.length} produk, ${customers.length} pelanggan, ${transactions.length} transaksi.`,
      data: {
        materials,
        customers,
        suppliers,
        transactions,
        settings,
      },
    });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
    const errInfo = formatMySqlError(err, host, Number(port), user, database);
    return res.status(200).json(errInfo);
  }
});

// 5. Custom Query Execution
app.post('/api/mysql/query', async (req: Request, res: Response) => {
  const { config, sql } = req.body;
  const { host = 'localhost', port = 3306, user = 'root', password = '', database = 'kasir_db' } = config || {};
  const safeDb = database.replace(/[^a-zA-Z0-9_]/g, '') || 'kasir_db';

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ success: false, message: 'Query SQL harus diisi.' });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port) || 3306,
      user,
      password,
      database: safeDb,
      connectTimeout: 5000,
    });

    const [rows, fields]: any = await connection.query(sql);
    await connection.end();

    return res.json({
      success: true,
      message: 'Query berhasil dieksekusi',
      rows: Array.isArray(rows) ? rows : [rows],
      fields: Array.isArray(fields) ? fields.map((f: any) => f.name) : [],
    });
  } catch (err: any) {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
    return res.status(200).json({
      success: false,
      message: `Error SQL: ${err.message}`,
    });
  }
});

// 6. Google Sheets Apps Script Webhook Relay & Proxy
// Follows 302 redirects automatically and solves browser CORS restrictions completely
app.post('/api/sheets/webhook-proxy', async (req: Request, res: Response) => {
  const { webhookUrl, action = 'ping', payload = {} } = req.body;

  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'URL Webhook Google Apps Script harus diisi.' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        payload,
      }),
      redirect: 'follow',
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: response.ok, message: text || 'Respons diterima dari Google Webhook' };
    }

    return res.json({
      success: data.success !== false,
      message: data.message || 'Berhasil terhubung dengan Google Apps Script Webhook',
      data: data.data || data,
    });
  } catch (err: any) {
    console.error('Error in /api/sheets/webhook-proxy:', err);
    return res.status(200).json({
      success: false,
      message: `Gagal menghubungi Google Apps Script: ${err.message || 'Koneksi gagal'}`,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development: integrate Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] POS Toko Bangunan server running on http://0.0.0.0:${PORT} (Mode: ${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
});
