import bcrypt from 'bcryptjs';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';

const firestore = getDb();

type CounterName = 'members' | 'deposits' | 'withdrawals' | 'returns' | 'admins';

const COLLECTIONS = {
  MEMBERS: 'members',
  DEPOSITS: 'deposits',
  WITHDRAWALS: 'withdrawals',
  RETURNS: 'returns',
  ADMINS: 'admins',
  CALCULATED_MONTHS: 'calculated_months',
  COUNTERS: 'counters',
  LOGIN_OTPS: 'login_otps',
  RESET_OTPS: 'reset_otps'
} as const;

async function getNextSequence(name: CounterName) {
  const counterRef = firestore.collection(COLLECTIONS.COUNTERS).doc(name);
  let nextValue = 1;

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()?.current ?? 0) : 0;
    nextValue = current + 1;
    tx.set(counterRef, { current: nextValue }, { merge: true });
  });

  return nextValue;
}

async function generateMemberCode(name: string) {
  const normalized = name.trim().toLowerCase();
  const snapshot = await firestore
    .collection(COLLECTIONS.MEMBERS)
    .where('name_lower', '==', normalized)
    .get();
  const count = snapshot.size;
  return `${name}-${count + 1}`;
}

async function ensureDefaultAdmin() {
  const adminsRef = firestore.collection(COLLECTIONS.ADMINS);
  const snapshot = await adminsRef.where('username', '==', 'admin').limit(1).get();
  if (snapshot.empty) {
    const adminId = await getNextSequence('admins');
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    await adminsRef.doc(String(adminId)).set({
      id: adminId,
      username: 'admin',
      email: 'admin@example.com',
      password: defaultPassword,
      role: 'super_admin',
      created_at: new Date().toISOString()
    });
  }
}

ensureDefaultAdmin().catch((err) => {
  console.error('Failed to ensure default admin:', err);
});

function mapDoc<T>(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const data = doc.data() || {};
  return { id: data.id ?? Number(doc.id), ...(data as T) };
}

async function getCollection<T>(name: string) {
  const snapshot = await firestore.collection(name).get();
  return snapshot.docs.map((doc) => mapDoc<T>(doc));
}

const dbMethods = {
  // Members
  async getMembers() {
    const [members, deposits, withdrawals, returns] = await Promise.all([
      getCollection<any>(COLLECTIONS.MEMBERS),
      getCollection<any>(COLLECTIONS.DEPOSITS),
      getCollection<any>(COLLECTIONS.WITHDRAWALS),
      getCollection<any>(COLLECTIONS.RETURNS)
    ]);

    return members.map((member) => {
      const memberDeposits = deposits.filter((d) => d.member_id === member.id);
      const memberWithdrawals = withdrawals.filter((w) => w.member_id === member.id);
      const memberReturns = returns.filter((r) => r.member_id === member.id);

      return {
        ...member,
        total_deposits: memberDeposits.reduce((sum, d) => sum + (d.amount || 0), 0),
        total_withdrawals: memberWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0),
        total_returns: memberReturns.reduce((sum, r) => sum + (r.return_amount || 0), 0)
      };
    });
  },

  async getMember(id: number) {
    const memberRef = firestore.collection(COLLECTIONS.MEMBERS).doc(String(id));
    const snap = await memberRef.get();
    if (!snap.exists) return null;
    const member = mapDoc<any>(snap);

    const [deposits, withdrawals, returns] = await Promise.all([
      firestore.collection(COLLECTIONS.DEPOSITS).where('member_id', '==', id).get(),
      firestore.collection(COLLECTIONS.WITHDRAWALS).where('member_id', '==', id).get(),
      firestore.collection(COLLECTIONS.RETURNS).where('member_id', '==', id).get()
    ]);

    return {
      ...member,
      deposits: deposits.docs.map((doc) => mapDoc<any>(doc)),
      withdrawals: withdrawals.docs.map((doc) => mapDoc<any>(doc)),
      returns: returns.docs.map((doc) => mapDoc<any>(doc))
    };
  },

  async createMember(data: any) {
    const memberId = await getNextSequence('members');
    const memberCode = await generateMemberCode(data.name);
    const member = {
      id: memberId,
      name: data.name,
      name_lower: data.name.toLowerCase(),
      unique_number: memberId,
      member_code: memberCode,
      alias_name: data.alias_name || null,
      village: data.village || null,
      town: data.town || null,
      percentage_of_return: parseFloat(data.percentage_of_return) || 0,
      date_of_return: parseInt(data.date_of_return ?? '30', 10) || 30,
      referral_name: data.referral_name || null,
      referral_percent: parseFloat(data.referral_percent) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await firestore.collection(COLLECTIONS.MEMBERS).doc(String(memberId)).set(member);
    return member;
  },

  async updateMember(id: number, data: any) {
    const memberRef = firestore.collection(COLLECTIONS.MEMBERS).doc(String(id));
    const snap = await memberRef.get();
    if (!snap.exists) return false;

    const existing = snap.data() || {};
    let memberCode = existing.member_code;
    if (data.name && data.name !== existing.name) {
      memberCode = await generateMemberCode(data.name);
    }

    await memberRef.set(
      {
        name: data.name ?? existing.name,
        name_lower: (data.name ?? existing.name).toLowerCase(),
        member_code: memberCode,
        alias_name: data.alias_name ?? existing.alias_name ?? null,
        village: data.village ?? existing.village ?? null,
        town: data.town ?? existing.town ?? null,
        percentage_of_return: parseFloat(data.percentage_of_return ?? existing.percentage_of_return) || 0,
        date_of_return: parseInt(data.date_of_return ?? existing.date_of_return ?? 30, 10),
        referral_name: data.referral_name ?? existing.referral_name ?? null,
        referral_percent: parseFloat(data.referral_percent ?? existing.referral_percent) || 0,
        updated_at: new Date().toISOString()
      },
      { merge: true }
    );
    return true;
  },

  async deleteMember(id: number) {
    const batch = firestore.batch();
    batch.delete(firestore.collection(COLLECTIONS.MEMBERS).doc(String(id)));

    const collections = [COLLECTIONS.DEPOSITS, COLLECTIONS.WITHDRAWALS, COLLECTIONS.RETURNS];
    for (const col of collections) {
      const snapshot = await firestore.collection(col).where('member_id', '==', id).get();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    }

    await batch.commit();
    return true;
  },

  // Deposits
  async getDeposits() {
    const [deposits, members] = await Promise.all([
      getCollection<any>(COLLECTIONS.DEPOSITS),
      getCollection<any>(COLLECTIONS.MEMBERS)
    ]);
    return deposits.map((deposit) => {
      const member = members.find((m) => m.id === deposit.member_id);
      return {
        ...deposit,
        member_name: member?.name || '',
        alias_name: member?.alias_name || null,
        unique_number: member?.unique_number || null
      };
    });
  },

  async getDeposit(id: number) {
    const doc = await firestore.collection(COLLECTIONS.DEPOSITS).doc(String(id)).get();
    return doc.exists ? mapDoc<any>(doc) : null;
  },

  async createDeposit(data: any) {
    const depositId = await getNextSequence('deposits');
    const deposit = {
      id: depositId,
      member_id: parseInt(data.member_id, 10),
      amount: parseFloat(data.amount),
      deposit_date: data.deposit_date,
      percentage: data.percentage ? parseFloat(data.percentage) : null,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    await firestore.collection(COLLECTIONS.DEPOSITS).doc(String(depositId)).set(deposit);
    return deposit;
  },

  async updateDeposit(id: number, data: any) {
    const depositRef = firestore.collection(COLLECTIONS.DEPOSITS).doc(String(id));
    const snap = await depositRef.get();
    if (!snap.exists) return false;
    await depositRef.set(
      {
        member_id: parseInt(data.member_id, 10),
        amount: parseFloat(data.amount),
        deposit_date: data.deposit_date,
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        notes: data.notes || null
      },
      { merge: true }
    );
    return true;
  },

  async deleteDeposit(id: number) {
    await firestore.collection(COLLECTIONS.DEPOSITS).doc(String(id)).delete();
    return true;
  },

  // Withdrawals
  async getWithdrawals() {
    const [withdrawals, members] = await Promise.all([
      getCollection<any>(COLLECTIONS.WITHDRAWALS),
      getCollection<any>(COLLECTIONS.MEMBERS)
    ]);
    return withdrawals.map((withdrawal) => {
      const member = members.find((m) => m.id === withdrawal.member_id);
      return {
        ...withdrawal,
        member_name: member?.name || '',
        alias_name: member?.alias_name || null,
        unique_number: member?.unique_number || null
      };
    });
  },

  async getWithdrawal(id: number) {
    const doc = await firestore.collection(COLLECTIONS.WITHDRAWALS).doc(String(id)).get();
    return doc.exists ? mapDoc<any>(doc) : null;
  },

  async createWithdrawal(data: any) {
    const withdrawalId = await getNextSequence('withdrawals');
    const withdrawal = {
      id: withdrawalId,
      member_id: parseInt(data.member_id, 10),
      amount: parseFloat(data.amount),
      withdrawal_date: data.withdrawal_date,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    await firestore.collection(COLLECTIONS.WITHDRAWALS).doc(String(withdrawalId)).set(withdrawal);
    return withdrawal;
  },

  async updateWithdrawal(id: number, data: any) {
    const withdrawalRef = firestore.collection(COLLECTIONS.WITHDRAWALS).doc(String(id));
    const snap = await withdrawalRef.get();
    if (!snap.exists) return false;
    await withdrawalRef.set(
      {
        member_id: parseInt(data.member_id, 10),
        amount: parseFloat(data.amount),
        withdrawal_date: data.withdrawal_date,
        notes: data.notes || null
      },
      { merge: true }
    );
    return true;
  },

  async deleteWithdrawal(id: number) {
    await firestore.collection(COLLECTIONS.WITHDRAWALS).doc(String(id)).delete();
    return true;
  },

  // Returns
  async getReturns() {
    const [returns, members] = await Promise.all([
      getCollection<any>(COLLECTIONS.RETURNS),
      getCollection<any>(COLLECTIONS.MEMBERS)
    ]);
    return returns.map((returnItem) => {
      const member = members.find((m) => m.id === returnItem.member_id);
      return {
        ...returnItem,
        member_name: member?.name || '',
        alias_name: member?.alias_name || null,
        percentage_of_return: member?.percentage_of_return || 0
      };
    });
  },

  async createReturn(data: any) {
    const returnId = await getNextSequence('returns');
    const returnItem = {
      id: returnId,
      member_id: parseInt(data.member_id, 10),
      return_amount: parseFloat(data.return_amount),
      return_date: data.return_date,
      interest_days: parseInt(data.interest_days, 10) || 30,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    await firestore.collection(COLLECTIONS.RETURNS).doc(String(returnId)).set(returnItem);
    return returnItem;
  },

  async isMonthCalculated(monthKey: string) {
    const doc = await firestore.collection(COLLECTIONS.CALCULATED_MONTHS).doc(monthKey).get();
    return doc.exists;
  },

  async markMonthCalculated(monthKey: string) {
    await firestore.collection(COLLECTIONS.CALCULATED_MONTHS).doc(monthKey).set({
      calculated: true,
      timestamp: Timestamp.now()
    });
  },

  // Admins
  async getAdminByUsername(username: string) {
    const snapshot = await firestore
      .collection(COLLECTIONS.ADMINS)
      .where('username', '==', username)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return mapDoc<any>(snapshot.docs[0]);
  },

  async getAdminById(id: number) {
    const doc = await firestore.collection(COLLECTIONS.ADMINS).doc(String(id)).get();
    return doc.exists ? mapDoc<any>(doc) : null;
  },

  async updateAdminPassword(id: number, hashedPassword: string) {
    await firestore.collection(COLLECTIONS.ADMINS).doc(String(id)).set(
      {
        password: hashedPassword,
        updated_at: new Date().toISOString()
      },
      { merge: true }
    );
  },

  async saveOtpRecord(data: { email: string; otp: string; purpose: 'login' | 'reset'; expires_at: number }) {
    await firestore.collection(data.purpose === 'login' ? COLLECTIONS.LOGIN_OTPS : COLLECTIONS.RESET_OTPS).doc(data.email).set({
      email: data.email,
      otp_hash: bcrypt.hashSync(data.otp, 10),
      expires_at: data.expires_at,
      created_at: new Date().toISOString()
    });
  },

  async verifyOtp(email: string, otp: string, purpose: 'login' | 'reset') {
    const doc = await firestore
      .collection(purpose === 'login' ? COLLECTIONS.LOGIN_OTPS : COLLECTIONS.RESET_OTPS)
      .doc(email)
      .get();
    if (!doc.exists) return false;
    const data = doc.data();
    if (!data) return false;
    if (Date.now() > data.expires_at) {
      await doc.ref.delete();
      return false;
    }
    const isValid = bcrypt.compareSync(otp, data.otp_hash);
    if (isValid) {
      await doc.ref.delete();
      return true;
    }
    return false;
  }
};

export default dbMethods;

