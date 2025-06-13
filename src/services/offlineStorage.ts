import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface OfflineDataValue {
  budgets: any[];
  summary: any;
  monthlySpend: number[];
  lastSync: number;
}

interface OfflineDataEntry {
  key: string;
  value: OfflineDataValue;
}

interface ReceiptDB extends DBSchema {
  pendingReceipts: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      status: 'pending' | 'syncing' | 'synced' | 'error';
    };
  };
  offlineData: {
    key: string;
    value: OfflineDataEntry;
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<ReceiptDB> | null = null;
  private readonly DB_NAME = 'i58-receipts-db';
  private readonly VERSION = 1;

  async init() {
    if (!this.db) {
      this.db = await openDB<ReceiptDB>(this.DB_NAME, this.VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('pendingReceipts')) {
            db.createObjectStore('pendingReceipts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('offlineData')) {
            db.createObjectStore('offlineData', { keyPath: 'key' });
          }
        },
      });
    }
    return this.db;
  }

  async savePendingReceipt(receiptData: any) {
    const db = await this.init();
    const id = crypto.randomUUID();
    await db.put('pendingReceipts', {
      id,
      data: receiptData,
      timestamp: Date.now(),
      status: 'pending'
    });
    return id;
  }

  async getPendingReceipts() {
    const db = await this.init();
    return db.getAll('pendingReceipts');
  }

  async updateReceiptStatus(id: string, status: 'syncing' | 'synced' | 'error') {
    const db = await this.init();
    const receipt = await db.get('pendingReceipts', id);
    if (receipt) {
      receipt.status = status;
      await db.put('pendingReceipts', receipt);
    }
  }

  async deletePendingReceipt(id: string) {
    const db = await this.init();
    await db.delete('pendingReceipts', id);
  }

  async saveOfflineData(key: string, data: OfflineDataValue) {
    const db = await this.init();
    const entry: OfflineDataEntry = {
      key,
      value: {
        ...data,
        lastSync: Date.now()
      }
    };
    await db.put('offlineData', entry);
  }

  async getOfflineData(key: string): Promise<OfflineDataValue | undefined> {
    const db = await this.init();
    const entry = await db.get('offlineData', key);
    return entry?.value;
  }

  async clearOfflineData() {
    const db = await this.init();
    await db.clear('offlineData');
  }
}

export const offlineStorage = new OfflineStorageService(); 