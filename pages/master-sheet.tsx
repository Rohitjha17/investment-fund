import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Transaction {
  id: number | string;
  transaction_type: 'deposit' | 'withdrawal' | 'return';
  member_id: number;
  member_name: string;
  alias_name?: string;
  unique_number?: number;
  village?: string;
  town?: string;
  percentage_of_return?: number;
  amount: number;
  date: string;
  notes?: string;
  deposit_date?: string;
  withdrawal_date?: string;
  return_date?: string;
  interest_days?: number;
  is_calculated?: boolean;
  month_key?: string;
  deposits?: Array<{
    id: number;
    amount: number;
    deposit_date: string;
    percentage: number;
  }>;
}

export default function MasterSheet() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [columnFilters, setColumnFilters] = useState({
    paymentDate: false,
    memberDetails: false,
    location: false,
    investmentDate: false,
    modeOfPayment: false,
    totalDeposits: false,
    returnRate: false,
    returnAmount: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementData, setStatementData] = useState<Transaction[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, selectedMember]);

  const checkAuth = async () => {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      router.push('/');
    }
  };

  // Removed checkAndCalculateMonthlyReturns - it should only run on 2nd of month, not on every page load

  // Helper function to generate all months between two dates
  const getAllMonthsBetween = (startDate: Date, endDate: Date): string[] => {
    const months: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const selectedMonthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const selectedMonthEndDate = new Date(parseInt(year), parseInt(month) - 1, lastDay, 23, 59, 59, 999);
      
      // Fetch members first (needed for both stored and calculated)
      const membersRes = await fetch('/api/members?_t=' + Date.now(), { cache: 'no-store' });
      const membersData = await membersRes.json();
      
      const membersToShow = selectedMember 
        ? membersData.filter((m: any) => m.id === parseInt(selectedMember))
        : membersData;
      
      if (membersToShow.length === 0) {
        setTransactions([]);
        return;
      }

      // Create member details map from basic data (no extra API calls needed)
      const memberDetailsMap = new Map<number, any>();
      membersToShow.forEach((m: any) => {
        memberDetailsMap.set(m.id, m);
      });

      // OPTIMIZED: Only calculate for selected month, not all historical months
      // This dramatically reduces API calls and loading time
      const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEndDate = new Date(parseInt(year), parseInt(month) - 1, lastDay, 23, 59, 59, 999);
      
      // Calculate returns for selected month only (in parallel for all members)
      const calculationPromises = membersToShow.map(async (member: any) => {
        // Skip if no deposits
        if (!member.deposits || member.deposits.length === 0) {
          return null;
        }
        
        // Check if member has any deposit on or before selected month
        const hasDepositOnOrBefore = member.deposits.some((d: any) => {
          const depositDate = new Date(d.deposit_date);
          return depositDate <= monthEndDate;
        });
        
        if (!hasDepositOnOrBefore) {
          return null;
        }
        
        try {
          const calcRes = await fetch('/api/calculate-complex-interest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_id: member.id,
              start_date: monthStartDate.toISOString().split('T')[0],
              end_date: monthEndDate.toISOString().split('T')[0]
            })
          });
          const calcData = await calcRes.json();
          
          if (calcData.interest > 0) {
            return {
              id: `calculated-${member.id}-${selectedMonth}`,
              type: 'return',
              transaction_type: 'return',
              member_id: member.id,
              member_name: member.name,
              alias_name: member.alias_name,
              unique_number: member.unique_number,
              village: member.village,
              town: member.town,
              percentage_of_return: member.percentage_of_return,
              deposits: member.deposits || [],
              amount: calcData.interest,
              date: monthEndDate.toISOString().split('T')[0],
              interest_days: 30, // Hardcoded 30 days as per client requirement
              notes: `Calculated for ${selectedMonth}`,
              is_calculated: true,
              month_key: selectedMonth
            };
          }
        } catch (error) {
          console.error(`Error calculating return for member ${member.id}:`, error);
        }
        return null;
      });
      
      // Wait for all calculations
      const results = await Promise.all(calculationPromises);
      const validResults = results.filter((r: any) => r !== null);
      
      // Sort by member name
      const sortedData = validResults.sort((a: any, b: any) => {
        const nameA = (a.member_name || '').toLowerCase();
        const nameB = (b.member_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setTransactions(sortedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('Error loading master sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateMonthlyReturns = async () => {
    try {
      const res = await fetch('/api/calculate-monthly-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Success! ${data.message}\nMembers: ${data.membersCalculated}, Total: ₹${data.totalReturns}`);
        fetchTransactions();
      } else {
        alert(data.error || 'Failed to calculate returns');
      }
    } catch (error) {
      console.error('Error calculating monthly returns:', error);
      alert('Failed to calculate monthly returns');
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const generateMemberStatement = async () => {
    if (!selectedMember) {
      alert('Please select a member first');
      return;
    }

    try {
      setStatementLoading(true);
      
      // Fetch member details
      const memberRes = await fetch(`/api/members/${selectedMember}?_t=${Date.now()}`, { cache: 'no-store' });
      const memberData = await memberRes.json();
      setSelectedMemberDetails(memberData);

      if (!memberData || !memberData.deposits || memberData.deposits.length === 0) {
        alert('No deposits found for this member');
        setStatementLoading(false);
        return;
      }

      // Get earliest deposit date
      const depositDates = memberData.deposits.map((d: any) => new Date(d.deposit_date));
      const earliestDepositDate = new Date(Math.min(...depositDates.map((d: Date) => d.getTime())));
      const firstDepositMonth = new Date(earliestDepositDate.getFullYear(), earliestDepositDate.getMonth(), 1);
      
      // Get current month
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Generate all months from first deposit to current month
      const monthsToCalculate = getAllMonthsBetween(firstDepositMonth, currentMonth);
      
      // Calculate returns for ALL months (no stored returns - always calculate fresh)
      // Only calculate for months where member had deposits BEFORE that month ends
      const calculationPromises = monthsToCalculate.map(async (monthKey) => {
        const [monthYear, monthNum] = monthKey.split('-');
        const monthStartDate = new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1);
        const monthLastDay = new Date(parseInt(monthYear), parseInt(monthNum), 0).getDate();
        const monthEndDate = new Date(parseInt(monthYear), parseInt(monthNum) - 1, monthLastDay, 23, 59, 59, 999);
        
        // Check if member has any deposit on or before this month's end
        const hasDepositInOrBeforeMonth = memberData.deposits.some((d: any) => {
          const depositDate = new Date(d.deposit_date);
          return depositDate <= monthEndDate;
        });
        
        if (!hasDepositInOrBeforeMonth) {
          return null; // Skip months before first deposit
        }
        
        try {
          const calcRes = await fetch('/api/calculate-complex-interest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_id: parseInt(selectedMember),
              start_date: monthStartDate.toISOString().split('T')[0],
              end_date: monthEndDate.toISOString().split('T')[0]
            })
          });
          const calcData = await calcRes.json();
          
          if (calcData.interest > 0) {
            return {
              id: `calculated-${selectedMember}-${monthKey}`,
              type: 'return',
              transaction_type: 'return',
              member_id: parseInt(selectedMember),
              member_name: memberData.name || '',
              alias_name: memberData.alias_name || '',
              unique_number: memberData.unique_number || 0,
              village: memberData.village || '',
              town: memberData.town || '',
              percentage_of_return: memberData.percentage_of_return || 0,
              deposits: memberData.deposits || [],
              amount: calcData.interest,
              date: monthEndDate.toISOString().split('T')[0],
              interest_days: 30, // Hardcoded 30 days as per client requirement
              notes: `Calculated for ${monthKey}`,
              is_calculated: true,
              month_key: monthKey
            };
          }
        } catch (error) {
          console.error(`Error calculating return for month ${monthKey}:`, error);
        }
        return null;
      });
      
      // Wait for all calculations
      const results = await Promise.all(calculationPromises);
      const validResults = results.filter((r: any) => r !== null) as Transaction[];
      
      // Sort by date (oldest first)
      const sortedStatement = validResults.sort((a: Transaction, b: Transaction) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setStatementData(sortedStatement);
      setShowStatementModal(true);
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Error generating statement. Please try again.');
    } finally {
      setStatementLoading(false);
    }
  };

  const exportStatementToExcel = () => {
    if (statementData.length === 0 || !selectedMemberDetails) {
      alert('No statement data to export');
      return;
    }

    // Prepare data for Excel
    const excelData = statementData.map((t, index) => {
      const deposits = (t as any).deposits || [];
      const transDate = new Date(t.date);
      const monthYear = transDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const paymentDate = `2nd ${monthYear}`;
      
      // Filter deposits made in this specific month
      const depositsThisMonth = deposits.filter((d: any) => {
        const depositDate = new Date(d.deposit_date);
        return depositDate.getMonth() === transDate.getMonth() && 
               depositDate.getFullYear() === transDate.getFullYear();
      });
      
      // Calculate deposits for this month only
      const depositAmountThisMonth = depositsThisMonth.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
      
      // Get investment dates for this month
      const investmentDates = depositsThisMonth.map((d: any) => 
        new Date(d.deposit_date).toLocaleDateString('en-IN')
      ).join(', ');
      
      return {
        'S.No': index + 1,
        'Month': monthYear,
        'Payment Date': paymentDate,
        'Investment Date': investmentDates || '-',
        'Deposit This Month (₹)': depositAmountThisMonth > 0 ? depositAmountThisMonth : '-',
        'Return Rate (%)': (t as any).percentage_of_return || '',
        'Return Amount (₹)': Math.abs(t.amount),
        'Interest Days': t.interest_days || ''
      };
    });

    // Add summary row
    const totalReturns = statementData.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalDeposits = (selectedMemberDetails.deposits || []).reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
    excelData.push({
      'S.No': statementData.length + 1,
      'Month': 'TOTAL',
      'Payment Date': '',
      'Investment Date': '',
      'Deposit This Month (₹)': totalDeposits,
      'Return Rate (%)': '',
      'Return Amount (₹)': totalReturns,
      'Interest Days': ''
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statement');

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 20 }, // Month
      { wch: 20 }, // Payment Date
      { wch: 20 }, // Investment Date
      { wch: 20 }, // Deposit This Month
      { wch: 12 }, // Return Rate
      { wch: 18 }, // Return Amount
      { wch: 12 }  // Interest Days
    ];

    // Generate filename
    const memberName = selectedMemberDetails.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Statement_${memberName}_${selectedMemberDetails.unique_number || ''}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    if (currentPage > 1) {
      pages.push(
        <button
          key="prev"
          onClick={() => setCurrentPage(currentPage - 1)}
          style={{
            padding: '8px 12px',
            margin: '0 4px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            background: '#ffffff',
            color: '#64748b',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.color = '#6366f1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          ← Previous
        </button>
      );
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          style={{
            padding: '8px 12px',
            margin: '0 4px',
            border: '2px solid',
            borderColor: i === currentPage ? '#6366f1' : '#e2e8f0',
            borderRadius: '8px',
            background: i === currentPage ? '#6366f1' : '#ffffff',
            color: i === currentPage ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (i !== currentPage) {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#6366f1';
            }
          }}
          onMouseOut={(e) => {
            if (i !== currentPage) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
            }
          }}
        >
          {i}
        </button>
      );
    }

    // Next button
    if (currentPage < totalPages) {
      pages.push(
        <button
          key="next"
          onClick={() => setCurrentPage(currentPage + 1)}
          style={{
            padding: '8px 12px',
            margin: '0 4px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            background: '#ffffff',
            color: '#64748b',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.color = '#6366f1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          Next →
        </button>
      );
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '24px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {pages}
      </div>
    );
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }

    // Check if all columns are hidden
    if (Object.values(columnFilters).every(v => v)) {
      alert('Cannot export: All columns are hidden. Please show at least one column.');
      return;
    }

    // Prepare data for Excel - only include visible columns
    const excelData = transactions.map((t, index) => {
      const deposits = (t as any).deposits || [];
      const totalDeposits = deposits.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
      
      // Get payment date - always 2nd of month
      const transDate = new Date(t.date);
      const monthYear = transDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const paymentDate = `2nd ${monthYear}`;
      
      const rowData: any = {
        'S.No': index + 1
      };

      // Only add columns that are visible (not filtered out)
      if (!columnFilters.paymentDate) {
        rowData['Payment Date'] = paymentDate;
      }
      if (!columnFilters.memberDetails) {
        rowData['Unique #'] = t.unique_number || '';
        rowData['Member Name'] = t.member_name;
        rowData['Alias Name'] = t.alias_name || '';
      }
      if (!columnFilters.location) {
        rowData['Village'] = (t as any).village || '';
        rowData['Town'] = (t as any).town || '';
      }
      if (!columnFilters.investmentDate) {
        const sortedDeposits = [...deposits].sort((a: any, b: any) => 
          new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
        );
        const firstDeposit = sortedDeposits[0];
        rowData['Date of Investment'] = firstDeposit ? new Date(firstDeposit.deposit_date).toLocaleDateString('en-IN') : '';
      }
      if (!columnFilters.modeOfPayment) {
        const sortedDeposits = [...deposits].sort((a: any, b: any) => 
          new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
        );
        const firstDeposit = sortedDeposits[0];
        rowData['Mode of Payment'] = firstDeposit?.mode_of_payment || '';
      }
      if (!columnFilters.totalDeposits) {
        rowData['Total Deposits (₹)'] = totalDeposits;
      }
      if (!columnFilters.returnRate) {
        rowData['Return Rate (%)'] = (t as any).percentage_of_return || '';
      }
      if (!columnFilters.returnAmount) {
        rowData['Return Amount (₹)'] = Math.abs(t.amount);
      }

      return rowData;
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Returns');

    // Set column widths dynamically based on visible columns
    const colWidths: any[] = [{ wch: 6 }]; // S.No always included
    
    if (!columnFilters.paymentDate) colWidths.push({ wch: 20 }); // Payment Date
    if (!columnFilters.memberDetails) {
      colWidths.push({ wch: 10 }); // Unique #
      colWidths.push({ wch: 25 }); // Member Name
      colWidths.push({ wch: 15 }); // Alias Name
    }
    if (!columnFilters.location) {
      colWidths.push({ wch: 20 }); // Village
      colWidths.push({ wch: 20 }); // Town
    }
    if (!columnFilters.investmentDate) colWidths.push({ wch: 18 }); // Date of Investment
    if (!columnFilters.modeOfPayment) colWidths.push({ wch: 18 }); // Mode of Payment
    if (!columnFilters.totalDeposits) colWidths.push({ wch: 18 }); // Total Deposits
    if (!columnFilters.returnRate) colWidths.push({ wch: 12 }); // Return Rate
    if (!columnFilters.returnAmount) colWidths.push({ wch: 18 }); // Return Amount
    
    ws['!cols'] = colWidths;

    // Generate filename with month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const [year, month] = selectedMonth.split('-');
    const monthName = monthNames[parseInt(month) - 1];
    const fileName = `Returns_${monthName}_${year}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);
  };

  // Generate month options (last 12 months)
  // Removed getMonthOptions - now using month input type for better date selection

  if (loading) {
    return (
      <div className="container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Loading master sheet...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Master Sheet - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      <div className="container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ 
              position: 'relative', 
              width: '180px', 
              height: '60px',
              minWidth: '120px'
            }}>
              <Image
                src="/images/lfgpl-logo.png"
                alt="LakhDatar Fast Grow Pvt Ltd"
                fill
                style={{ objectFit: 'contain' }}
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target) target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <button onClick={() => router.push('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '16px' }}>
                ← Back to Dashboard
              </button>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '4px'
              }}>
                Master Sheet
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Returns Details - All Members Monthly Returns</p>
            </div>
          </div>
        </div>

        {/* Month Selector and Excel Export */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Select Month</h3>
            <button
              onClick={exportToExcel}
              className="btn btn-success"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 700,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
              disabled={transactions.length === 0}
            >
              Download Filtered Excel
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Month *</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  fontSize: '16px',
                  padding: '12px',
                  width: '100%',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
                min="2010-01"
                max={`${new Date().getFullYear()}-12`}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Filter by Member</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                style={{ fontSize: '16px', padding: '12px', width: '100%' }}
              >
                <option value="">All Members</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.unique_number && `(#${member.unique_number})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {(selectedMember) && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedMember('')}
                className="btn btn-secondary"
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                Clear Member Filter
              </button>
              <button
                onClick={generateMemberStatement}
                className="btn btn-primary"
                style={{ 
                  fontSize: '14px', 
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600
                }}
                disabled={statementLoading}
              >
                {statementLoading ? 'Generating...' : 'Generate Complete Statement'}
              </button>
            </div>
          )}
        </div>

        {/* Column Filter Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Column Filters</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setColumnFilters({
                  paymentDate: false, memberDetails: false, location: false,
                  investmentDate: false, modeOfPayment: false,
                  totalDeposits: false, returnRate: false, returnAmount: false
                })}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Show All
              </button>
              <button
                onClick={() => setColumnFilters({
                  paymentDate: true, memberDetails: true, location: true,
                  investmentDate: true, modeOfPayment: true,
                  totalDeposits: true, returnRate: true, returnAmount: true
                })}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Hide All
              </button>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
            background: '#f8fafc',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #e2e8f0'
          }}>
            {Object.entries({
              paymentDate: 'Payment Date',
              memberDetails: 'Member Details',
              location: 'Village - Town',
              investmentDate: 'Date of Investment',
              modeOfPayment: 'Mode of Payment',
              totalDeposits: 'Total Deposits',
              returnRate: 'Return Rate',
              returnAmount: 'Return Amount'
            }).map(([key, label]) => (
              <label key={key} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                background: columnFilters[key as keyof typeof columnFilters] ? '#fee2e2' : '#f0f9ff',
                border: `2px solid ${columnFilters[key as keyof typeof columnFilters] ? '#fca5a5' : '#bae6fd'}`,
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={columnFilters[key as keyof typeof columnFilters]}
                  onChange={(e) => setColumnFilters(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    accentColor: '#ef4444'
                  }}
                />
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: columnFilters[key as keyof typeof columnFilters] ? '#dc2626' : '#0369a1'
                }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
          
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: '#fef3c7', 
            borderRadius: '8px',
            border: '1px solid #fbbf24'
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '13px', 
              color: '#92400e', 
              fontWeight: 600 
            }}>
              <strong>Filter Logic:</strong> Checked = Hide column, Unchecked = Show column. 
              Downloads will only include visible columns.
            </p>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Returns Details</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                Showing all months from first deposit date to selected month: {(() => {
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                    'July', 'August', 'September', 'October', 'November', 'December'];
                  const [year, month] = selectedMonth.split('-');
                  return monthNames[parseInt(month) - 1] + ' ' + year;
                })()}
              </p>
              {transactions.some((t: any) => t.is_dynamic) && (
                <p style={{ margin: '8px 0 0 0', color: '#92400e', fontSize: '12px', fontWeight: 600 }}>
                  🔄 Showing live calculations - Returns will be saved on 2nd of month
                </p>
              )}
            </div>
            <span style={{
              color: '#64748b',
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              Page {currentPage} of {totalPages} ({transactions.length} total returns)
            </span>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
            <table className="table">
              <thead>
                <tr>
                  {!columnFilters.paymentDate && <th>Payment Date</th>}
                  <th>Month</th>
                  {!columnFilters.memberDetails && <th>Member Details</th>}
                  {!columnFilters.location && <th>Village - Town</th>}
                  {!columnFilters.investmentDate && <th>Date of Investment</th>}
                  {!columnFilters.modeOfPayment && <th>Mode of Payment</th>}
                  {!columnFilters.totalDeposits && <th>Total Deposits</th>}
                  {!columnFilters.returnRate && <th>Return Rate</th>}
                  {!columnFilters.returnAmount && <th>Return Amount</th>}
                </tr>
              </thead>
              <tbody>
                {currentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(columnFilters).filter(v => !v).length + 1 || 2} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        No returns found.
                      </p>
                    </td>
                  </tr>
                ) : Object.values(columnFilters).every(v => v) ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        All columns are hidden. Uncheck some filters to show data.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentTransactions.map((transaction) => {
                    // Calculate total deposits
                    const totalDeposits = (transaction as any).deposits && (transaction as any).deposits.length > 0
                      ? (transaction as any).deposits.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0)
                      : 0;
                    
                    // Get month and year from transaction date
                    const transDate = new Date(transaction.date);
                    const monthYear = transDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                    
                    // Get month key from transaction (if available) or calculate from date
                    const monthKey = (transaction as any).month_key || 
                      `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
                    const [monthYearNum, monthNum] = monthKey.split('-');
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthDisplay = `${monthNames[parseInt(monthNum) - 1]} ${monthYearNum}`;
                    
                    return (
                      <tr key={`${transaction.transaction_type}-${transaction.id}`}>
                        {!columnFilters.paymentDate && (
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                2nd {monthYear}
                              </span>
                            </div>
                          </td>
                        )}
                        <td style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>
                          {monthDisplay}
                        </td>
                        {!columnFilters.memberDetails && (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
                                  {transaction.member_name}
                                </span>
                                {transaction.unique_number && (
                                  <span style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700
                                  }}>
                                    #{transaction.unique_number}
                                  </span>
                                )}
                              </div>
                              {transaction.alias_name && (
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                  ({transaction.alias_name})
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {!columnFilters.location && (
                          <td style={{ fontSize: '13px', color: '#475569' }}>
                            {(transaction as any).village && (transaction as any).town 
                              ? `${(transaction as any).village} - ${(transaction as any).town}`
                              : (transaction as any).village || (transaction as any).town || 
                                <span style={{ color: '#94a3b8' }}>-</span>}
                          </td>
                        )}
                        {!columnFilters.investmentDate && (
                          <td style={{ fontSize: '13px', color: '#475569' }}>
                            {(() => {
                              const deposits = (transaction as any).deposits || [];
                              if (deposits.length === 0) return <span style={{ color: '#94a3b8' }}>-</span>;
                              const sortedDeposits = [...deposits].sort((a: any, b: any) => 
                                new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
                              );
                              const firstDeposit = sortedDeposits[0];
                              return new Date(firstDeposit.deposit_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              });
                            })()}
                          </td>
                        )}
                        {!columnFilters.modeOfPayment && (
                          <td style={{ fontSize: '13px', color: '#475569' }}>
                            {(() => {
                              const deposits = (transaction as any).deposits || [];
                              if (deposits.length === 0) return <span style={{ color: '#94a3b8' }}>-</span>;
                              const sortedDeposits = [...deposits].sort((a: any, b: any) => 
                                new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
                              );
                              const firstDeposit = sortedDeposits[0];
                              return firstDeposit.mode_of_payment || <span style={{ color: '#94a3b8' }}>-</span>;
                            })()}
                          </td>
                        )}
                        {!columnFilters.totalDeposits && (
                          <td style={{ fontWeight: 700, color: '#10b981', fontSize: '16px' }}>
                            {totalDeposits > 0 ? formatCurrency(totalDeposits) : <span style={{ color: '#94a3b8' }}>₹0</span>}
                          </td>
                        )}
                        {!columnFilters.returnRate && (
                          <td>
                            {(transaction as any).percentage_of_return ? (
                              <span style={{
                                background: '#f0fdf4',
                                color: '#166534',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 700,
                                border: '1px solid #bbf7d0'
                              }}>
                                {(transaction as any).percentage_of_return}%
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                        )}
                        {!columnFilters.returnAmount && (
                          <td style={{
                            color: '#3b82f6',
                            fontWeight: 800,
                            fontSize: '18px'
                          }}>
                            {formatCurrency(Math.abs(transaction.amount))}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {renderPagination()}
        </div>

      </div>

      {/* Statement Modal */}
      {showStatementModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowStatementModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '95%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowStatementModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: 800,
                marginBottom: '8px',
                color: '#1e293b'
              }}>
                Complete Statement
              </h2>
              {selectedMemberDetails && (
                <div style={{ color: '#64748b', fontSize: '16px' }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Member:</strong> {selectedMemberDetails.name}
                    {selectedMemberDetails.unique_number && ` (#${selectedMemberDetails.unique_number})`}
                  </p>
                  {selectedMemberDetails.alias_name && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Alias:</strong> {selectedMemberDetails.alias_name}
                    </p>
                  )}
                  {(selectedMemberDetails.village || selectedMemberDetails.town) && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>Location:</strong> {selectedMemberDetails.village || ''} {selectedMemberDetails.village && selectedMemberDetails.town ? '-' : ''} {selectedMemberDetails.town || ''}
                    </p>
                  )}
                  <p style={{ margin: '4px 0' }}>
                    <strong>Total Deposits:</strong> {formatCurrency(
                      (selectedMemberDetails.deposits || []).reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0)
                    )}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Total Returns:</strong> {formatCurrency(statementData.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Total Months:</strong> {statementData.length}
                  </p>
                </div>
              )}
            </div>

            {/* Export button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={exportStatementToExcel}
                className="btn btn-success"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Export Statement to Excel
              </button>
            </div>

            {/* Statement Table */}
            {statementData.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ 
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white'
                    }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>S.No</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Month</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Payment Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Investment Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Deposit This Month</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Return Rate</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Return Amount</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Interest Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.map((transaction, index) => {
                      const deposits = (transaction as any).deposits || [];
                      const transDate = new Date(transaction.date);
                      const monthYear = transDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                      const paymentDate = `2nd ${monthYear}`;
                      
                      // Filter deposits made in this specific month
                      const depositsThisMonth = deposits.filter((d: any) => {
                        const depositDate = new Date(d.deposit_date);
                        return depositDate.getMonth() === transDate.getMonth() && 
                               depositDate.getFullYear() === transDate.getFullYear();
                      });
                      
                      // Calculate deposits for this month only
                      const depositAmountThisMonth = depositsThisMonth.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
                      
                      // Get investment dates for this month
                      const investmentDates = depositsThisMonth.map((d: any) => 
                        new Date(d.deposit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      ).join(', ');

                      return (
                        <tr 
                          key={`statement-${transaction.id}-${index}`}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                          }}
                        >
                          <td style={{ padding: '12px', fontWeight: 600 }}>{index + 1}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{monthYear}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{paymentDate}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>
                            {investmentDates || <span style={{ color: '#94a3b8' }}>-</span>}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: depositAmountThisMonth > 0 ? '#10b981' : '#94a3b8' }}>
                            {depositAmountThisMonth > 0 ? formatCurrency(depositAmountThisMonth) : '-'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {(transaction as any).percentage_of_return ? (
                              <span style={{
                                background: '#f0fdf4',
                                color: '#166534',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 700,
                                border: '1px solid #bbf7d0'
                              }}>
                                {(transaction as any).percentage_of_return}%
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 800, fontSize: '16px' }}>
                            {formatCurrency(Math.abs(transaction.amount))}
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {transaction.interest_days || '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr style={{
                      background: '#f1f5f9',
                      fontWeight: 800,
                      borderTop: '3px solid #6366f1'
                    }}>
                      <td colSpan={6} style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                        TOTAL:
                      </td>
                      <td style={{ padding: '12px', color: '#3b82f6', fontSize: '18px' }}>
                        {formatCurrency(statementData.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                      </td>
                      <td style={{ padding: '12px' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: '#64748b'
              }}>
                No statement data available
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

