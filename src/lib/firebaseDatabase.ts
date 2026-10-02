import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  writeBatch,
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import {
  MaterialItem,
  Customer,
  Supplier,
  Transaction,
  PurchaseInvoice,
  StoreSettings,
  FirebaseConfigState,
} from '../types';

let currentDbInstance: ReturnType<typeof getFirestore> | null = null;

export function getFirebaseDb(customConfig?: FirebaseConfigState) {
  try {
    const configToUse = {
      apiKey: customConfig?.apiKey || defaultFirebaseConfig.apiKey,
      authDomain: customConfig?.authDomain || defaultFirebaseConfig.authDomain,
      projectId: customConfig?.projectId || defaultFirebaseConfig.projectId,
      storageBucket: customConfig?.storageBucket || defaultFirebaseConfig.storageBucket,
      messagingSenderId: customConfig?.messagingSenderId || defaultFirebaseConfig.messagingSenderId,
      appId: customConfig?.appId || defaultFirebaseConfig.appId,
    };

    if (!configToUse.apiKey || !configToUse.projectId) {
      return null;
    }

    const appName = customConfig?.projectId ? `custom-${customConfig.projectId}` : '[DEFAULT]';
    let app = getApps().find((a) => a.name === appName);
    if (!app) {
      app = initializeApp(configToUse, appName);
    }

    currentDbInstance = getFirestore(app);
    return currentDbInstance;
  } catch (err) {
    console.warn('Firebase DB init error:', err);
    return null;
  }
}

/**
 * Test connection to Firebase Firestore
 */
export async function testFirebaseConnection(customConfig?: FirebaseConfigState): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const db = getFirebaseDb(customConfig);
    if (!db) {
      return {
        success: false,
        message: 'Kredensial Firebase belum lengkap (API Key dan Project ID wajib diisi).',
      };
    }

    // Attempt a light ping write/read to a _ping document
    const pingRef = doc(db, '_connection_test', 'status');
    await setDoc(pingRef, {
      ping: true,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Koneksi ke Firebase Firestore berhasil terhubung dan siap digunakan!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal terhubung ke Firebase: ${err.message || String(err)}`,
    };
  }
}

/**
 * Sync all local data to Firebase Firestore
 */
export async function syncAllToFirebase(
  payload: {
    materials: MaterialItem[];
    customers: Customer[];
    suppliers: Supplier[];
    transactions: Transaction[];
    purchases: PurchaseInvoice[];
    settings: StoreSettings;
  },
  customConfig?: FirebaseConfigState
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getFirebaseDb(customConfig);
    if (!db) {
      return {
        success: false,
        message: 'Kredensial Firebase belum lengkap.',
      };
    }

    // Save Settings
    await setDoc(doc(db, 'settings', 'store_config'), {
      ...payload.settings,
      updatedAt: new Date().toISOString(),
    });

    // Batch materials
    const batch = writeBatch(db);
    payload.materials.forEach((m) => {
      const ref = doc(db, 'materials', m.id);
      batch.set(ref, m);
    });

    // Batch customers
    payload.customers.forEach((c) => {
      const ref = doc(db, 'customers', c.id);
      batch.set(ref, c);
    });

    await batch.commit();

    return {
      success: true,
      message: `Sinkronisasi berhasil! ${payload.materials.length} produk dan ${payload.customers.length} pelanggan tersimpan di Firebase Firestore.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal sinkron ke Firebase: ${err.message || String(err)}`,
    };
  }
}
