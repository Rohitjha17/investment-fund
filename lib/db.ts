import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'investment.json');
const backupDir = path.join(process.cwd(), 'backups');

interface Database {
  members: any[];
  deposits: any[];
  withdrawals: any[];
  returns: any[];
  admins: any[];
  calculated_months?: string[]; // Track which months have returns calculated (format: YYYY-MM)
}

let db: Database = {
  members: [],
  deposits: [],
  withdrawals: [],
  returns: [],
  admins: [],
  calculated_months: []
};

let nextId = { members: 1, deposits: 1, withdrawals: 1, returns: 1, admins: 1 };

// Load database from file
function loadDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      db = JSON.parse(data);
      
      // Calculate next IDs
      nextId.members = db.members.length > 0 ? Math.max(...db.members.map(m => m.id)) + 1 : 1;
      nextId.deposits = db.deposits.length > 0 ? Math.max(...db.deposits.map(d => d.id)) + 1 : 1;
      nextId.withdrawals = db.withdrawals.length > 0 ? Math.max(...db.withdrawals.map(w => w.id)) + 1 : 1;
      nextId.returns = db.returns.length > 0 ? Math.max(...db.returns.map(r => r.id)) + 1 : 1;
      nextId.admins = db.admins.length > 0 ? Math.max(...db.admins.map(a => a.id)) + 1 : 1;
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

// Create backup before saving
function createBackup() {
  try {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Only backup if file exists
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `investment-backup-${timestamp}.json`);
      
      // Copy current file to backup
      fs.copyFileSync(dbPath, backupPath);
      
      // Keep only last 5 backups (delete older ones)
      const backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('investment-backup-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Sort by newest first
      
      // Delete backups older than 5 most recent
      if (backupFiles.length > 5) {
        backupFiles.slice(5).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error(`Error deleting old backup ${file.name}:`, err);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    // Don't fail save operation if backup fails
  }
}

// Save database to file with backup protection
function saveDatabase() {
  try {
    // Create backup before saving
    createBackup();
    
    // Validate data before saving
    if (!db || typeof db !== 'object') {
      throw new Error('Invalid database state');
    }

    // Create temporary file first (atomic write)
    const tempPath = dbPath + '.tmp';
    const jsonData = JSON.stringify(db, null, 2);
    
    // Write to temp file
    fs.writeFileSync(tempPath, jsonData, 'utf-8');
    
    // Validate temp file can be parsed
    const testData = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
    if (!testData) {
      throw new Error('Invalid JSON data');
    }
    
    // Only if temp file is valid, replace original
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('Error saving database:', error);
    // If temp file exists, remove it
    try {
      const tempPath = dbPath + '.tmp';
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
    // Don't throw - allow app to continue but log error
  }
}

// Initialize database
export function initDatabase() {
  loadDatabase();
  
  // Ensure all existing members have unique numbers and member_code
  let maxUniqueNumber = 0;
  let needsUpdate = false;
  
  db.members.forEach((member, index) => {
    // Assign unique_number if missing
    if (!member.unique_number || member.unique_number === 0) {
      maxUniqueNumber++;
      member.unique_number = maxUniqueNumber;
      needsUpdate = true;
    } else {
      if (member.unique_number > maxUniqueNumber) {
        maxUniqueNumber = member.unique_number;
      }
    }
    
    // Assign member_code if missing (based on name + count)
    if (!member.member_code) {
      const sameNameCount = db.members.filter((m, idx) => 
        idx < index && m.name.toLowerCase() === member.name.toLowerCase()
      ).length;
      member.member_code = `${member.name}-${sameNameCount + 1}`;
      needsUpdate = true;
    }
  });
  
  // Reassign sequential numbers if there are gaps or duplicates
  if (needsUpdate || db.members.some((m, i) => {
    const others = db.members.filter((other, idx) => idx !== i && other.unique_number === m.unique_number);
    return others.length > 0;
  })) {
    db.members.forEach((member, index) => {
      member.unique_number = index + 1;
    });
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    saveDatabase();
  }
  
  // Create default admin if not exists
  const adminExists = db.admins.find(a => a.username === 'admin');
  if (!adminExists) {
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.admins.push({
      id: nextId.admins++,
      username: 'admin',
      password: defaultPassword,
      role: 'super_admin',
      created_at: new Date().toISOString()
    });
    saveDatabase();
  }
}

// Database methods
const dbMethods = {
  // Members
  getMembers() {
    return db.members.map(member => {
      const deposits = db.deposits.filter(d => d.member_id === member.id);
      const withdrawals = db.withdrawals.filter(w => w.member_id === member.id);
      const returns = db.returns.filter(r => r.member_id === member.id);
      
      const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
      const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
      const totalReturns = returns.reduce((sum, r) => sum + r.return_amount, 0);
      
      return {
        ...member,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_returns: totalReturns
      };
    });
  },

  getMember(id: number) {
    const member = db.members.find(m => m.id === id);
    if (!member) return null;
    
    const deposits = db.deposits.filter(d => d.member_id === id);
    const withdrawals = db.withdrawals.filter(w => w.member_id === id);
    const returns = db.returns.filter(r => r.member_id === id);
    
    return {
      ...member,
      deposits,
      withdrawals,
      returns
    };
  },

  createMember(data: any) {
    // Generate sequential unique number for all members
    const maxUniqueNumber = db.members.length > 0 
      ? Math.max(...db.members.map(m => m.unique_number || 0))
      : 0;
    const uniqueNumber = maxUniqueNumber + 1;
    
    // Generate member_code based on name + count (for same names)
    const sameNameCount = db.members.filter(m => 
      m.name.toLowerCase() === data.name.toLowerCase()
    ).length;
    const memberCode = `${data.name}-${sameNameCount + 1}`;
    
    const member = {
      id: nextId.members++,
      name: data.name,
      unique_number: uniqueNumber,
      member_code: memberCode,
      alias_name: data.alias_name || null,
      village: data.village || null,
      town: data.town || null,
      percentage_of_return: parseFloat(data.percentage_of_return) || 0,
      date_of_return: parseInt(data.date_of_return) || 0,
      referral_name: data.referral_name || null,
      referral_percent: parseFloat(data.referral_percent) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.members.push(member);
    saveDatabase();
    return member;
  },

  updateMember(id: number, data: any) {
    const index = db.members.findIndex(m => m.id === id);
    if (index === -1) return false;
    
    const existingMember = db.members[index];
    // Keep the existing unique_number - it should not change on update
    const existingUniqueNumber = existingMember.unique_number || existingMember.id;
    
    // Recalculate member_code if name changed
    let memberCode = existingMember.member_code || `${existingMember.name}-1`;
    if (data.name && data.name !== existingMember.name) {
      const sameNameCount = db.members.filter(m => 
        m.id !== id && m.name.toLowerCase() === data.name.toLowerCase()
      ).length;
      memberCode = `${data.name}-${sameNameCount + 1}`;
    }
    
    db.members[index] = {
      ...existingMember,
      name: data.name,
      unique_number: existingUniqueNumber,
      member_code: memberCode,
      alias_name: data.alias_name || null,
      village: data.village || null,
      town: data.town || null,
      percentage_of_return: parseFloat(data.percentage_of_return) || 0,
      date_of_return: parseInt(data.date_of_return) || 0,
      referral_name: data.referral_name || null,
      referral_percent: parseFloat(data.referral_percent) || 0,
      updated_at: new Date().toISOString()
    };
    saveDatabase();
    return true;
  },

  deleteMember(id: number) {
    const index = db.members.findIndex(m => m.id === id);
    if (index === -1) return false;
    
    db.members.splice(index, 1);
    // Delete related records
    db.deposits = db.deposits.filter(d => d.member_id !== id);
    db.withdrawals = db.withdrawals.filter(w => w.member_id !== id);
    db.returns = db.returns.filter(r => r.member_id !== id);
    saveDatabase();
    return true;
  },

  // Deposits
  getDeposits() {
    return db.deposits.map(deposit => {
      const member = db.members.find(m => m.id === deposit.member_id);
      return {
        ...deposit,
        member_name: member?.name || '',
        alias_name: member?.alias_name || null,
        unique_number: member?.unique_number || 1
      };
    });
  },

  getDeposit(id: number) {
    return db.deposits.find(d => d.id === id) || null;
  },

  createDeposit(data: any) {
    const deposit = {
      id: nextId.deposits++,
      member_id: parseInt(data.member_id),
      amount: parseFloat(data.amount),
      deposit_date: data.deposit_date,
      percentage: data.percentage ? parseFloat(data.percentage) : null,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    db.deposits.push(deposit);
    saveDatabase();
    return deposit;
  },

  updateDeposit(id: number, data: any) {
    const index = db.deposits.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    db.deposits[index] = {
      ...db.deposits[index],
      member_id: parseInt(data.member_id),
      amount: parseFloat(data.amount),
      deposit_date: data.deposit_date,
      percentage: data.percentage ? parseFloat(data.percentage) : null,
      notes: data.notes || null
    };
    saveDatabase();
    return true;
  },

  deleteDeposit(id: number) {
    const index = db.deposits.findIndex(d => d.id === id);
    if (index === -1) return false;
    db.deposits.splice(index, 1);
    saveDatabase();
    return true;
  },

  // Withdrawals
  getWithdrawals() {
    return db.withdrawals.map(withdrawal => {
      const member = db.members.find(m => m.id === withdrawal.member_id);
      return {
        ...withdrawal,
        member_name: member?.name || '',
        alias_name: member?.alias_name || null,
        unique_number: member?.unique_number || 1
      };
    });
  },

  getWithdrawal(id: number) {
    return db.withdrawals.find(w => w.id === id) || null;
  },

  createWithdrawal(data: any) {
    const withdrawal = {
      id: nextId.withdrawals++,
      member_id: parseInt(data.member_id),
      amount: parseFloat(data.amount),
      withdrawal_date: data.withdrawal_date,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    db.withdrawals.push(withdrawal);
    saveDatabase();
    return withdrawal;
  },

  updateWithdrawal(id: number, data: any) {
    const index = db.withdrawals.findIndex(w => w.id === id);
    if (index === -1) return false;
    
    db.withdrawals[index] = {
      ...db.withdrawals[index],
      member_id: parseInt(data.member_id),
      amount: parseFloat(data.amount),
      withdrawal_date: data.withdrawal_date,
      notes: data.notes || null
    };
    saveDatabase();
    return true;
  },

  deleteWithdrawal(id: number) {
    const index = db.withdrawals.findIndex(w => w.id === id);
    if (index === -1) return false;
    db.withdrawals.splice(index, 1);
    saveDatabase();
    return true;
  },

  // Returns
  getReturns() {
    return db.returns.map(returnItem => {
      const member = db.members.find(m => m.id === returnItem.member_id);
      return {
        ...returnItem,
        member_name: member?.name || '',
        alias_name: member?.alias_name || null,
        percentage_of_return: member?.percentage_of_return || 0
      };
    });
  },

  createReturn(data: any) {
    const returnItem = {
      id: nextId.returns++,
      member_id: parseInt(data.member_id),
      return_amount: parseFloat(data.return_amount),
      return_date: data.return_date,
      interest_days: parseInt(data.interest_days) || 30,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    db.returns.push(returnItem);
    saveDatabase();
    return returnItem;
  },

  // Track calculated months
  isMonthCalculated(monthKey: string): boolean {
    if (!db.calculated_months) {
      db.calculated_months = [];
    }
    return db.calculated_months.includes(monthKey);
  },

  markMonthCalculated(monthKey: string) {
    if (!db.calculated_months) {
      db.calculated_months = [];
    }
    if (!db.calculated_months.includes(monthKey)) {
      db.calculated_months.push(monthKey);
      saveDatabase();
    }
  },

  // Admins
  getAdminByUsername(username: string) {
    return db.admins.find(a => a.username === username) || null;
  },

  getAdminById(id: number) {
    return db.admins.find(a => a.id === id) || null;
  }
};

// Initialize on import
initDatabase();

export default dbMethods;
