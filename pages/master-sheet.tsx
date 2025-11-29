import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Transaction {
  id: number;
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
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: ''
  });
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [columnFilters, setColumnFilters] = useState({
    paymentDate: false,
    memberDetails: false,
    location: false,
    totalDeposits: false,
    returnRate: false,
    returnAmount: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    checkAuth();
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, selectedMember]);

  useEffect(() => {
    // Update date filter based on selected month
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-30`;
      setDateFilter({ start_date: startDate, end_date: endDate });
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchTransactions();
  }, [dateFilter.start_date, dateFilter.end_date, selectedMember]);

  const checkAuth = async () => {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      router.push('/');
    }
  };

  // Removed checkAndCalculateMonthlyReturns - it should only run on 2nd of month, not on every page load

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Calculate date range from selected month
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month) - 1, 30, 23, 59, 59, 999);
      
      let url = '/api/master-transactions?';
      if (selectedMember) {
        url += `member_id=${selectedMember}&`;
      }
      // Always use selected month for date filtering
      url += `start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`;
      
      // Add cache-busting parameter
      url += `&_t=${Date.now()}`;
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await res.json();
      
      // Master sheet shows only returns
      let filteredData = data.filter((t: Transaction) => t.transaction_type === 'return');
      
      // If no returns found for this month, check if we're looking at current or future months
      // and create dynamic returns from all members
      if (filteredData.length === 0) {
        const today = new Date();
        const selectedMonthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        
        // Only show dynamic returns for current or future months
        if (selectedMonthDate >= new Date(today.getFullYear(), today.getMonth(), 1)) {
          // Fetch all members and calculate their current returns
          const membersRes = await fetch('/api/members');
          const membersData = await membersRes.json();
          
          // Filter by selected member if needed
          const membersToShow = selectedMember 
            ? membersData.filter((m: any) => m.id === parseInt(selectedMember))
            : membersData;
          
          // OPTIMIZED: Use batch endpoints instead of individual API calls
          const memberIds = membersToShow.map((m: any) => m.id);
          
          // Fetch all member details and returns in parallel
          const [membersDetails, returnsData] = await Promise.all([
            Promise.all(memberIds.map((id: number) => 
              fetch(`/api/members/${id}`).then(res => res.json())
            )),
            fetch('/api/member/batch-current-returns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member_ids: memberIds })
            }).then(res => res.json()).then(data => data.current_returns || {})
          ]);
          
          // Create dynamic return entries
          filteredData = membersToShow.map((member: any, index: number) => {
            const memberData = membersDetails[index];
            const currentReturn = returnsData[member.id] || 0;
            
            return {
              id: `dynamic-${member.id}`,
              type: 'return',
              transaction_type: 'return',
              member_id: member.id,
              member_name: memberData?.name || member.name,
              alias_name: memberData?.alias_name || member.alias_name,
              unique_number: memberData?.unique_number || member.unique_number,
              village: memberData?.village || member.village,
              town: memberData?.town || member.town,
              percentage_of_return: memberData?.percentage_of_return || member.percentage_of_return,
              deposits: memberData?.deposits || [],
              amount: currentReturn,
              date: endDate.toISOString().split('T')[0], // Use end of month
              interest_days: 30,
              notes: 'Calculated dynamically',
              is_dynamic: true
            };
          });
        }
      }
      
      // Sort transactions alphabetically by member name
      const sortedData = filteredData.sort((a: any, b: any) => {
        const nameA = (a.member_name || '').toLowerCase();
        const nameB = (b.member_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setTransactions(sortedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[date.getMonth()];
      options.push({ value: monthKey, label: `${monthName} ${year}` });
    }
    
    return options;
  };

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
                📊 Master Sheet
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Returns Details - All Members Monthly Returns</p>
            </div>
          </div>
        </div>

        {/* Month Selector and Excel Export */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>📅 Select Month</h3>
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
              📥 Download Filtered Excel
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Month *</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ fontSize: '16px', padding: '12px', width: '100%' }}
              >
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
            <button
              onClick={() => setSelectedMember('')}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '8px 16px', marginTop: '16px' }}
            >
              Clear Member Filter
            </button>
          )}
        </div>

        {/* Column Filter Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>🔧 Column Filters</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setColumnFilters({
                  paymentDate: false, memberDetails: false, location: false,
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
                  {columnFilters[key as keyof typeof columnFilters] ? '🚫' : '✅'} {label}
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
              💡 <strong>Filter Logic:</strong> Checked = Hide column, Unchecked = Show column. 
              Downloads will only include visible columns.
            </p>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Returns Details</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                {(() => {
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
                  {!columnFilters.memberDetails && <th>Member Details</th>}
                  {!columnFilters.location && <th>Village - Town</th>}
                  {!columnFilters.totalDeposits && <th>Total Deposits</th>}
                  {!columnFilters.returnRate && <th>Return Rate</th>}
                  {!columnFilters.returnAmount && <th>Return Amount</th>}
                </tr>
              </thead>
              <tbody>
                {currentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(columnFilters).filter(v => !v).length || 1} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        No returns found.
                      </p>
                    </td>
                  </tr>
                ) : Object.values(columnFilters).every(v => v) ? (
                  <tr>
                    <td colSpan={1} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👻</div>
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
    </>
  );
}

