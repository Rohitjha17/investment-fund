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

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
  initializeFirestore().catch(console.error);
}

