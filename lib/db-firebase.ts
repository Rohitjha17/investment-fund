import { db, Timestamp } from './firebase';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { COLLECTIONS, getNextId, initializeFirestore } from './firestore-init';

// Auto-initialize Firestore on first import
if (typeof window !== 'undefined') {
  initializeFirestore().catch(console.error);
}

// Helper to convert Firestore timestamp to ISO string
const toISO = (data: any) => {
  if (!data) return null;
  if (data.toDate) return data.toDate().toISOString();
  if (data instanceof Timestamp) return data.toDate().toISOString();
  return data;
};

// Helper to convert ISO string to Firestore timestamp
const toTimestamp = (dateString: string) => {
  if (!dateString) return null;
  return Timestamp.fromDate(new Date(dateString));
};

// Database methods using Firestore
const dbMethods = {
  // Members
  async getMembers() {
    try {
      const membersSnapshot = await getDocs(collection(db, COLLECTIONS.members));
      const members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get all deposits, withdrawals, returns
      const [depositsSnapshot, withdrawalsSnapshot, returnsSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.deposits)),
        getDocs(collection(db, COLLECTIONS.withdrawals)),
        getDocs(collection(db, COLLECTIONS.returns))
      ]);

      const deposits = depositsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const withdrawals = withdrawalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const returns = returnsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      return members.map(member => {
        const memberId = parseInt(member.id) || member.id;
        const memberDeposits = deposits.filter((d: any) => {
          const depositMemberId = parseInt(d.member_id) || d.member_id;
          return depositMemberId === memberId || depositMemberId === parseInt(member.id) || depositMemberId === member.id;
        });
        const memberWithdrawals = withdrawals.filter((w: any) => {
          const withdrawalMemberId = parseInt(w.member_id) || w.member_id;
          return withdrawalMemberId === memberId || withdrawalMemberId === parseInt(member.id) || withdrawalMemberId === member.id;
        });
        const memberReturns = returns.filter((r: any) => {
          const returnMemberId = parseInt(r.member_id) || r.member_id;
          return returnMemberId === memberId || returnMemberId === parseInt(member.id) || returnMemberId === member.id;
        });

        const totalDeposits = memberDeposits.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
        const totalWithdrawals = memberWithdrawals.reduce((sum: number, w: any) => sum + (parseFloat(w.amount) || 0), 0);
        const totalReturns = memberReturns.reduce((sum: number, r: any) => sum + (parseFloat(r.return_amount) || 0), 0);

        return {
          ...member,
          id: memberId,
          deposits: memberDeposits.map((d: any) => ({
            ...d,
            id: parseInt(d.id) || d.id,
            amount: parseFloat(d.amount) || 0,
            percentage: d.percentage !== null && d.percentage !== undefined ? parseFloat(d.percentage) : null,
            deposit_date: toISO(d.deposit_date)
          })),
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          total_returns: totalReturns
        };
      });
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  },

  async getMember(id: number) {
    try {
      const memberId = parseInt(id.toString());
      const memberDoc = await getDoc(doc(db, COLLECTIONS.members, memberId.toString()));
      if (!memberDoc.exists()) return null;

      const member = { id: memberDoc.id, ...memberDoc.data() };

      // Get all deposits and filter (handle both string and number member_id)
      const [allDepositsSnapshot, allWithdrawalsSnapshot, allReturnsSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.deposits)),
        getDocs(collection(db, COLLECTIONS.withdrawals)),
        getDocs(collection(db, COLLECTIONS.returns))
      ]);

      const allDeposits = allDepositsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const allWithdrawals = allWithdrawalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const allReturns = allReturnsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter by member_id (handle both string and number)
      const deposits = allDeposits.filter((d: any) => {
        const depositMemberId = parseInt(d.member_id) || d.member_id;
        return depositMemberId === memberId || depositMemberId === parseInt(member.id) || depositMemberId === member.id;
      });
      
      const withdrawals = allWithdrawals.filter((w: any) => {
        const withdrawalMemberId = parseInt(w.member_id) || w.member_id;
        return withdrawalMemberId === memberId || withdrawalMemberId === parseInt(member.id) || withdrawalMemberId === member.id;
      });
      
      const returns = allReturns.filter((r: any) => {
        const returnMemberId = parseInt(r.member_id) || r.member_id;
        return returnMemberId === memberId || returnMemberId === parseInt(member.id) || returnMemberId === member.id;
      });

      return {
        ...member,
        id: parseInt(member.id) || member.id,
        deposits: deposits.map((d: any) => ({
          ...d,
          id: parseInt(d.id) || d.id,
          amount: parseFloat(d.amount) || 0,
          percentage: d.percentage !== null && d.percentage !== undefined ? parseFloat(d.percentage) : null,
          deposit_date: toISO(d.deposit_date),
          created_at: toISO(d.created_at)
        })),
        withdrawals: withdrawals.map((w: any) => ({
          ...w,
          id: parseInt(w.id) || w.id,
          amount: parseFloat(w.amount) || 0,
          withdrawal_date: toISO(w.withdrawal_date),
          created_at: toISO(w.created_at)
        })),
        returns: returns.map((r: any) => ({
          ...r,
          id: parseInt(r.id) || r.id,
          return_amount: parseFloat(r.return_amount) || 0,
          return_date: toISO(r.return_date),
          created_at: toISO(r.created_at)
        }))
      };
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  },

  async createMember(data: any) {
    try {
      // Initialize Firestore if needed
      await initializeFirestore();
      
      // Get all members to calculate unique_number
      const membersSnapshot = await getDocs(collection(db, COLLECTIONS.members));
      const members = membersSnapshot.docs.map(d => d.data());
      
      const maxUniqueNumber = members.length > 0
        ? Math.max(...members.map((m: any) => m.unique_number || 0))
        : 0;
      const uniqueNumber = maxUniqueNumber + 1;

      const sameNameCount = members.filter((m: any) =>
        m.name?.toLowerCase() === data.name?.toLowerCase()
      ).length;
      const memberCode = `${data.name}-${sameNameCount + 1}`;

      // Get next ID using system document
      const newId = await getNextId('members');

      const member = {
        name: data.name,
        unique_number: uniqueNumber,
        member_code: memberCode,
        alias_name: data.alias_name || null,
        village: data.village || null,
        town: data.town || null,
        percentage_of_return: parseFloat(data.percentage_of_return) || 0,
        date_of_return: parseInt(data.date_of_return) || 30,
        referral_name: data.referral_name || null,
        referral_percent: parseFloat(data.referral_percent) || 0,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      await setDoc(doc(db, COLLECTIONS.members, newId.toString()), member);
      return { id: newId, ...member };
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  },

  async updateMember(id: number, data: any) {
    try {
      const memberRef = doc(db, COLLECTIONS.members, id.toString());
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) return false;

      const existingMember = memberDoc.data();
      const existingUniqueNumber = existingMember.unique_number || id;

      let memberCode = existingMember.member_code || `${existingMember.name}-1`;
      if (data.name && data.name !== existingMember.name) {
        const membersSnapshot = await getDocs(collection(db, COLLECTIONS.members));
        const members = membersSnapshot.docs.map(d => d.data());
        const sameNameCount = members.filter((m: any) =>
          parseInt(m.id) !== id && m.name?.toLowerCase() === data.name?.toLowerCase()
        ).length;
        memberCode = `${data.name}-${sameNameCount + 1}`;
      }

      await setDoc(memberRef, {
        ...existingMember,
        name: data.name,
        unique_number: existingUniqueNumber,
        member_code: memberCode,
        alias_name: data.alias_name || null,
        village: data.village || null,
        town: data.town || null,
        percentage_of_return: parseFloat(data.percentage_of_return) || 0,
        date_of_return: parseInt(data.date_of_return) || 30,
        referral_name: data.referral_name || null,
        referral_percent: parseFloat(data.referral_percent) || 0,
        updated_at: Timestamp.now()
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating member:', error);
      return false;
    }
  },

  async deleteMember(id: number) {
    try {
      // Delete member
      await deleteDoc(doc(db, COLLECTIONS.members, id.toString()));

      // Delete related deposits
      const depositsSnapshot = await getDocs(query(collection(db, COLLECTIONS.deposits), where('member_id', '==', id)));
      const batch1 = writeBatch(db);
      depositsSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
      await batch1.commit();

      // Delete related withdrawals
      const withdrawalsSnapshot = await getDocs(query(collection(db, COLLECTIONS.withdrawals), where('member_id', '==', id)));
      const batch2 = writeBatch(db);
      withdrawalsSnapshot.docs.forEach(doc => batch2.delete(doc.ref));
      await batch2.commit();

      // Delete related returns
      const returnsSnapshot = await getDocs(query(collection(db, COLLECTIONS.returns), where('member_id', '==', id)));
      const batch3 = writeBatch(db);
      returnsSnapshot.docs.forEach(doc => batch3.delete(doc.ref));
      await batch3.commit();

      return true;
    } catch (error) {
      console.error('Error deleting member:', error);
      return false;
    }
  },

  // Deposits
  async getDeposits() {
    try {
      const depositsSnapshot = await getDocs(collection(db, COLLECTIONS.deposits));
      const deposits = depositsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Get all members
      const membersSnapshot = await getDocs(collection(db, COLLECTIONS.members));
      const members = membersSnapshot.docs.reduce((acc: any, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      return deposits.map((deposit: any) => {
        const member = members[deposit.member_id?.toString()] || {};
        return {
          ...deposit,
          id: parseInt(deposit.id) || deposit.id,
          member_name: member.name || '',
          alias_name: member.alias_name || null,
          unique_number: member.unique_number || null,
          deposit_date: toISO(deposit.deposit_date),
          created_at: toISO(deposit.created_at)
        };
      });
    } catch (error) {
      console.error('Error getting deposits:', error);
      return [];
    }
  },

  async getDeposit(id: number) {
    try {
      const depositDoc = await getDoc(doc(db, COLLECTIONS.deposits, id.toString()));
      if (!depositDoc.exists()) return null;
      const data = depositDoc.data();
      return {
        id: parseInt(depositDoc.id) || depositDoc.id,
        ...data,
        deposit_date: toISO(data.deposit_date),
        created_at: toISO(data.created_at)
      };
    } catch (error) {
      console.error('Error getting deposit:', error);
      return null;
    }
  },

  async createDeposit(data: any) {
    try {
      // Get next ID using system document
      const newId = await getNextId('deposits');

      const deposit = {
        member_id: parseInt(data.member_id),
        amount: parseFloat(data.amount),
        deposit_date: data.deposit_date, // Store as string
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        notes: data.notes || null,
        created_at: Timestamp.now()
      };

      await setDoc(doc(db, COLLECTIONS.deposits, newId.toString()), deposit);
      return { id: newId, ...deposit };
    } catch (error) {
      console.error('Error creating deposit:', error);
      throw error;
    }
  },

  async updateDeposit(id: number, data: any) {
    try {
      const depositRef = doc(db, COLLECTIONS.deposits, id.toString());
      const depositDoc = await getDoc(depositRef);
      
      if (!depositDoc.exists()) return false;

      await setDoc(depositRef, {
        ...depositDoc.data(),
        member_id: parseInt(data.member_id),
        amount: parseFloat(data.amount),
        deposit_date: data.deposit_date,
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        notes: data.notes || null
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating deposit:', error);
      return false;
    }
  },

  async deleteDeposit(id: number) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.deposits, id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting deposit:', error);
      return false;
    }
  },

  // Withdrawals
  async getWithdrawals() {
    try {
      const withdrawalsSnapshot = await getDocs(collection(db, COLLECTIONS.withdrawals));
      const withdrawals = withdrawalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const membersSnapshot = await getDocs(collection(db, COLLECTIONS.members));
      const members = membersSnapshot.docs.reduce((acc: any, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      return withdrawals.map((withdrawal: any) => {
        const member = members[withdrawal.member_id?.toString()] || {};
        return {
          ...withdrawal,
          id: parseInt(withdrawal.id) || withdrawal.id,
          member_name: member.name || '',
          alias_name: member.alias_name || null,
          unique_number: member.unique_number || null,
          withdrawal_date: toISO(withdrawal.withdrawal_date),
          created_at: toISO(withdrawal.created_at)
        };
      });
    } catch (error) {
      console.error('Error getting withdrawals:', error);
      return [];
    }
  },

  async getWithdrawal(id: number) {
    try {
      const withdrawalDoc = await getDoc(doc(db, COLLECTIONS.withdrawals, id.toString()));
      if (!withdrawalDoc.exists()) return null;
      const data = withdrawalDoc.data();
      return {
        id: parseInt(withdrawalDoc.id) || withdrawalDoc.id,
        ...data,
        withdrawal_date: toISO(data.withdrawal_date),
        created_at: toISO(data.created_at)
      };
    } catch (error) {
      console.error('Error getting withdrawal:', error);
      return null;
    }
  },

  async createWithdrawal(data: any) {
    try {
      // Get next ID using system document
      const newId = await getNextId('withdrawals');

      const withdrawal = {
        member_id: parseInt(data.member_id),
        amount: parseFloat(data.amount),
        withdrawal_date: data.withdrawal_date,
        notes: data.notes || null,
        created_at: Timestamp.now()
      };

      await setDoc(doc(db, COLLECTIONS.withdrawals, newId.toString()), withdrawal);
      return { id: newId, ...withdrawal };
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      throw error;
    }
  },

  async updateWithdrawal(id: number, data: any) {
    try {
      const withdrawalRef = doc(db, COLLECTIONS.withdrawals, id.toString());
      const withdrawalDoc = await getDoc(withdrawalRef);
      
      if (!withdrawalDoc.exists()) return false;

      await setDoc(withdrawalRef, {
        ...withdrawalDoc.data(),
        member_id: parseInt(data.member_id),
        amount: parseFloat(data.amount),
        withdrawal_date: data.withdrawal_date,
        notes: data.notes || null
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      return false;
    }
  },

  async deleteWithdrawal(id: number) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.withdrawals, id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting withdrawal:', error);
      return false;
    }
  },

  // Returns
  async getReturns() {
    try {
      const returnsSnapshot = await getDocs(collection(db, COLLECTIONS.returns));
      const returns = returnsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const membersSnapshot = await getDocs(collection(db, COLLECTIONS.members));
      const members = membersSnapshot.docs.reduce((acc: any, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      return returns.map((returnItem: any) => {
        const member = members[returnItem.member_id?.toString()] || {};
        return {
          ...returnItem,
          id: parseInt(returnItem.id) || returnItem.id,
          member_name: member.name || '',
          alias_name: member.alias_name || null,
          percentage_of_return: member.percentage_of_return || 0,
          return_date: toISO(returnItem.return_date),
          created_at: toISO(returnItem.created_at)
        };
      });
    } catch (error) {
      console.error('Error getting returns:', error);
      return [];
    }
  },

  async createReturn(data: any) {
    try {
      // Get next ID using system document
      const newId = await getNextId('returns');

      const returnItem = {
        member_id: parseInt(data.member_id),
        return_amount: parseFloat(data.return_amount),
        return_date: data.return_date,
        interest_days: parseInt(data.interest_days) || 30,
        notes: data.notes || null,
        created_at: Timestamp.now()
      };

      await setDoc(doc(db, COLLECTIONS.returns, newId.toString()), returnItem);
      return { id: newId, ...returnItem };
    } catch (error) {
      console.error('Error creating return:', error);
      throw error;
    }
  },

  // Track calculated months
  async isMonthCalculated(monthKey: string): Promise<boolean> {
    try {
      const monthDoc = await getDoc(doc(db, COLLECTIONS.calculated_months, monthKey));
      return monthDoc.exists();
    } catch (error) {
      console.error('Error checking calculated month:', error);
      return false;
    }
  },

  async markMonthCalculated(monthKey: string) {
    try {
      await setDoc(doc(db, COLLECTIONS.calculated_months, monthKey), {
        calculated: true,
        calculated_at: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking month calculated:', error);
    }
  },

  // OTP methods removed - now using Firebase Auth email verification

  // Admin operations (for backward compatibility - will use Firebase Auth)
  async getAdminByUsername(username: string) {
    // This is now handled by Firebase Auth
    return null;
  },

  async getAdminById(id: number) {
    // This is now handled by Firebase Auth
    return null;
  }
};

export default dbMethods;

