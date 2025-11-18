import { db, Timestamp } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';

/**
 * Firestore Collection Structure and Initialization
 * 
 * This file defines the document structure and initializes Firestore collections
 */

// Collection names
export const COLLECTIONS = {
  members: 'members',
  deposits: 'deposits',
  withdrawals: 'withdrawals',
  returns: 'returns',
  calculated_months: 'calculated_months',
  system: 'system' // For system-wide settings
};

/**
 * Document Structures
 */

// Member Document Structure
export interface MemberDocument {
  id: string; // Document ID (used as numeric ID)
  name: string;
  unique_number: number;
  member_code: string; // Format: "Name-1", "Name-2", etc.
  alias_name: string | null;
  village: string | null;
  town: string | null;
  percentage_of_return: number;
  date_of_return: number; // Days (usually 30)
  referral_name: string | null;
  referral_percent: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Deposit Document Structure
export interface DepositDocument {
  id: string; // Document ID
  member_id: number; // Reference to member
  amount: number;
  deposit_date: string; // ISO date string (YYYY-MM-DD)
  percentage: number | null; // Custom rate for this deposit, or null for member default
  notes: string | null;
  created_at: Timestamp;
}

// Withdrawal Document Structure
export interface WithdrawalDocument {
  id: string; // Document ID
  member_id: number; // Reference to member
  amount: number;
  withdrawal_date: string; // ISO date string (YYYY-MM-DD)
  notes: string | null;
  created_at: Timestamp;
}

// Return Document Structure
export interface ReturnDocument {
  id: string; // Document ID
  member_id: number; // Reference to member
  return_amount: number;
  return_date: string; // ISO date string (YYYY-MM-DD)
  interest_days: number; // Days for which interest was calculated
  notes: string | null;
  created_at: Timestamp;
}

// Calculated Month Document Structure
export interface CalculatedMonthDocument {
  calculated: boolean;
  calculated_at: Timestamp;
  member_count?: number; // Number of members for whom returns were calculated
  total_returns?: number; // Total returns calculated for the month
}

// System Document Structure (for metadata)
export interface SystemDocument {
  last_member_id: number; // Last used member ID
  last_deposit_id: number; // Last used deposit ID
  last_withdrawal_id: number; // Last used withdrawal ID
  last_return_id: number; // Last used return ID
  version: string; // Database schema version
  initialized_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Initialize Firestore collections with default structure
 * This should be called once to set up the database
 */
export async function initializeFirestore(): Promise<boolean> {
  try {
    console.log('Initializing Firestore database...');

    // Check if system document exists
    const systemDocRef = doc(db, COLLECTIONS.system, 'config');
    const systemDoc = await getDoc(systemDocRef);

    if (!systemDoc.exists()) {
      // Initialize system config
      await setDoc(systemDocRef, {
        last_member_id: 0,
        last_deposit_id: 0,
        last_withdrawal_id: 0,
        last_return_id: 0,
        version: '1.0.0',
        initialized_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      console.log('✅ System config initialized');
    }

    // Initialize calculated_months collection (empty, documents added as needed)
    // Each month will be a document with key "YYYY-MM" (e.g., "2025-11")
    
    // Collections are created automatically when first document is added
    // No need to create empty collections
    
    console.log('✅ Firestore initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Firestore:', error);
    return false;
  }
}

/**
 * Get next ID for a collection
 */
export async function getNextId(collectionName: 'members' | 'deposits' | 'withdrawals' | 'returns'): Promise<number> {
  try {
    const systemDocRef = doc(db, COLLECTIONS.system, 'config');
    const systemDoc = await getDoc(systemDocRef);
    
    if (!systemDoc.exists()) {
      // Initialize if doesn't exist
      await initializeFirestore();
      return 1;
    }

    const data = systemDoc.data() as SystemDocument;
    const fieldMap: Record<typeof collectionName, keyof SystemDocument> = {
      members: 'last_member_id',
      deposits: 'last_deposit_id',
      withdrawals: 'last_withdrawal_id',
      returns: 'last_return_id'
    };

    const currentId = (data[fieldMap[collectionName]] as number) || 0;
    const nextId = currentId + 1;

    // Update system document
    await setDoc(systemDocRef, {
      ...data,
      [fieldMap[collectionName]]: nextId,
      updated_at: Timestamp.now()
    }, { merge: true });

    return nextId;
  } catch (error) {
    console.error(`Error getting next ID for ${collectionName}:`, error);
    // Fallback: get count of existing documents
    const snapshot = await getDocs(collection(db, COLLECTIONS[collectionName]));
    return snapshot.size + 1;
  }
}

/**
 * Migrate data from local JSON to Firestore (optional)
 * Call this once if you want to migrate existing investment.json data
 */
export async function migrateFromLocal(jsonData: any): Promise<boolean> {
  try {
    console.log('Starting data migration from local JSON...');
    
    const batch: any[] = [];
    
    // Migrate members
    if (jsonData.members && Array.isArray(jsonData.members)) {
      for (const member of jsonData.members) {
        const memberDocRef = doc(db, COLLECTIONS.members, member.id.toString());
        await setDoc(memberDocRef, {
          ...member,
          created_at: member.created_at ? Timestamp.fromDate(new Date(member.created_at)) : Timestamp.now(),
          updated_at: member.updated_at ? Timestamp.fromDate(new Date(member.updated_at)) : Timestamp.now()
        });
      }
      console.log(`✅ Migrated ${jsonData.members.length} members`);
    }

    // Migrate deposits
    if (jsonData.deposits && Array.isArray(jsonData.deposits)) {
      for (const deposit of jsonData.deposits) {
        const depositDocRef = doc(db, COLLECTIONS.deposits, deposit.id.toString());
        await setDoc(depositDocRef, {
          ...deposit,
          deposit_date: deposit.deposit_date || deposit.date || new Date().toISOString().split('T')[0],
          created_at: deposit.created_at ? Timestamp.fromDate(new Date(deposit.created_at)) : Timestamp.now()
        });
      }
      console.log(`✅ Migrated ${jsonData.deposits.length} deposits`);
    }

    // Migrate withdrawals
    if (jsonData.withdrawals && Array.isArray(jsonData.withdrawals)) {
      for (const withdrawal of jsonData.withdrawals) {
        const withdrawalDocRef = doc(db, COLLECTIONS.withdrawals, withdrawal.id.toString());
        await setDoc(withdrawalDocRef, {
          ...withdrawal,
          withdrawal_date: withdrawal.withdrawal_date || withdrawal.date || new Date().toISOString().split('T')[0],
          created_at: withdrawal.created_at ? Timestamp.fromDate(new Date(withdrawal.created_at)) : Timestamp.now()
        });
      }
      console.log(`✅ Migrated ${jsonData.withdrawals.length} withdrawals`);
    }

    // Migrate returns
    if (jsonData.returns && Array.isArray(jsonData.returns)) {
      for (const returnItem of jsonData.returns) {
        const returnDocRef = doc(db, COLLECTIONS.returns, returnItem.id.toString());
        await setDoc(returnDocRef, {
          ...returnItem,
          return_date: returnItem.return_date || returnItem.date || new Date().toISOString().split('T')[0],
          created_at: returnItem.created_at ? Timestamp.fromDate(new Date(returnItem.created_at)) : Timestamp.now()
        });
      }
      console.log(`✅ Migrated ${jsonData.returns.length} returns`);
    }

    // Migrate calculated months
    if (jsonData.calculated_months && Array.isArray(jsonData.calculated_months)) {
      for (const month of jsonData.calculated_months) {
        if (month && typeof month === 'string') {
          const monthDocRef = doc(db, COLLECTIONS.calculated_months, month);
          await setDoc(monthDocRef, {
            calculated: true,
            calculated_at: Timestamp.now()
          });
        }
      }
      console.log(`✅ Migrated ${jsonData.calculated_months.length} calculated months`);
    }

    // Update system config with migrated IDs
    const systemDocRef = doc(db, COLLECTIONS.system, 'config');
    const systemDoc = await getDoc(systemDocRef);
    const systemData = systemDoc.exists() ? systemDoc.data() : {};
    
    await setDoc(systemDocRef, {
      ...systemData,
      last_member_id: jsonData.members?.length || 0,
      last_deposit_id: jsonData.deposits?.length || 0,
      last_withdrawal_id: jsonData.withdrawals?.length || 0,
      last_return_id: jsonData.returns?.length || 0,
      version: '1.0.0',
      initialized_at: systemData.initialized_at || Timestamp.now(),
      updated_at: Timestamp.now()
    }, { merge: true });

    console.log('✅ Migration complete!');
    return true;
  } catch (error) {
    console.error('❌ Error during migration:', error);
    return false;
  }
}

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
  initializeFirestore().catch(console.error);
}

