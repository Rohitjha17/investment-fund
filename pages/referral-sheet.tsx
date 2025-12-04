import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import * as XLSX from 'xlsx';

interface ReferralCommission {
  referrer_name: string;
  total_commission: number;
  referred_count: number;
  breakdown: Array<{
    member_id: number;
    member_name: string;
    principal_amount: number;
    referral_percent: number;
    commission_amount: number;
    is_direct: boolean;
    investment_date?: string;
    withdrawal_amount?: number;
    withdrawal_dates?: string;
    is_account_closed?: boolean;
    current_balance?: number;
  }>;
}

interface ReferralData {
  period: string;
  start_date: string;
  end_date: string;
  referral_commissions: ReferralCommission[];
}

export default function ReferralSheet() {
  const router = useRouter();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [columnFilters, setColumnFilters] = useState({
    referrerName: false,
    referredCount: false,
    totalCommission: false,
    memberDetails: false,
    investmentDate: false,
    principalAmount: false,
    withdrawalAmount: false,
    accountStatus: false,
    referralPercent: false,
    commissionAmount: false
  });
  const [groupByReferrer, setGroupByReferrer] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchReferralData();
    setCurrentPage(1); // Reset to first page when month changes
  }, [selectedMonth]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const checkAuth = async () => {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      router.push('/');
    }
  };

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      // Add cache-busting parameter
      const url = `/api/referral-commissions?month=${selectedMonth}&_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        setReferralData(data);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Flatten referral data for table display
  const getFlattenedData = () => {
    if (!referralData) return [];
    
    // First, filter commissions by selected member if any
    let filteredCommissions = referralData.referral_commissions;
    if (selectedMember) {
      filteredCommissions = referralData.referral_commissions
        .map(commission => ({
          ...commission,
          breakdown: commission.breakdown.filter(b => b.member_id === parseInt(selectedMember))
        }))
        .filter(commission => commission.breakdown.length > 0);
    }
    
    if (groupByReferrer) {
      // Group by referrer name - show totals for each referrer
      const grouped: Record<string, any> = {};
      filteredCommissions.forEach(commission => {
        const key = commission.referrer_name.toLowerCase().trim();
        if (!grouped[key]) {
          grouped[key] = {
            referrer_name: commission.referrer_name,
            referred_count: 0,
            total_commission: 0,
            member_count: 0,
            total_principal: 0
          };
        }
        grouped[key].referred_count += commission.referred_count;
        grouped[key].total_commission += commission.breakdown.reduce((sum: number, b: any) => sum + b.commission_amount, 0);
        grouped[key].member_count += commission.breakdown.length;
        grouped[key].total_principal += commission.breakdown.reduce((sum: number, b: any) => sum + b.principal_amount, 0);
      });
      return Object.values(grouped);
    }
    
    const flattened: any[] = [];
    filteredCommissions.forEach(commission => {
      commission.breakdown.forEach(breakdown => {
        flattened.push({
          referrer_name: commission.referrer_name,
          referred_count: commission.referred_count,
          total_commission: commission.total_commission,
          member_id: breakdown.member_id,
          member_name: breakdown.member_name,
          principal_amount: breakdown.principal_amount,
          referral_percent: breakdown.referral_percent,
          commission_amount: breakdown.commission_amount,
          is_direct: breakdown.is_direct,
          investment_date: breakdown.investment_date,
          withdrawal_amount: breakdown.withdrawal_amount,
          withdrawal_dates: breakdown.withdrawal_dates,
          is_account_closed: breakdown.is_account_closed,
          current_balance: breakdown.current_balance
        });
      });
    });
    return flattened;
  };

  const flattenedData = getFlattenedData();
  
  // Pagination logic
  const totalPages = Math.ceil(flattenedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = flattenedData.slice(startIndex, endIndex);

  const exportToExcel = () => {
    if (!referralData || flattenedData.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = flattenedData.map(item => {
      const rowData: any = {};
      
      if (!columnFilters.referrerName) rowData['Referrer Name'] = item.referrer_name;
      if (!columnFilters.referredCount) rowData['Total Referred'] = item.referred_count;
      if (!columnFilters.totalCommission) rowData['Total Commission'] = item.total_commission;
      if (!columnFilters.memberDetails) rowData['Member Name'] = groupByReferrer ? `${item.member_count || 0} members` : item.member_name;
      if (!columnFilters.investmentDate) rowData['Investment Date'] = item.investment_date ? new Date(item.investment_date).toLocaleDateString('en-IN') : '-';
      if (!columnFilters.principalAmount) rowData['Principal Amount'] = groupByReferrer ? (item.total_principal || 0) : item.principal_amount;
      if (!columnFilters.withdrawalAmount) rowData['Withdrawal'] = item.withdrawal_amount ? `₹${item.withdrawal_amount} (${item.withdrawal_dates || ''})` : '-';
      if (!columnFilters.accountStatus) rowData['Account Status'] = item.is_account_closed ? 'Closed' : 'Active';
      if (!columnFilters.referralPercent) rowData['Referral %'] = groupByReferrer ? '-' : (item.referral_percent + '%');
      if (!columnFilters.commissionAmount) rowData['Commission Amount'] = groupByReferrer ? (item.total_commission || 0) : item.commission_amount;
      
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths: any[] = [];
    if (!columnFilters.referrerName) colWidths.push({ wch: 20 });
    if (!columnFilters.referredCount) colWidths.push({ wch: 15 });
    if (!columnFilters.totalCommission) colWidths.push({ wch: 18 });
    if (!columnFilters.memberDetails) colWidths.push({ wch: 25 });
    if (!columnFilters.investmentDate) colWidths.push({ wch: 15 });
    if (!columnFilters.principalAmount) colWidths.push({ wch: 18 });
    if (!columnFilters.withdrawalAmount) colWidths.push({ wch: 22 });
    if (!columnFilters.accountStatus) colWidths.push({ wch: 15 });
    if (!columnFilters.referralPercent) colWidths.push({ wch: 15 });
    if (!columnFilters.commissionAmount) colWidths.push({ wch: 20 });
    
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Referral Commissions');
    
    const fileName = `Referral_Commissions_${selectedMonth}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

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
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Loading referral data...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Referral Sheet - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      <div className="container">
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
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
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
              Dashboard
            </button>
            <button onClick={() => router.push('/master-sheet')} className="btn btn-success">
              Master Sheet
            </button>
            <button onClick={exportToExcel} className="btn btn-primary" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white'
            }}>
              Download Excel
            </button>
          </div>
        </div>

        {/* Month and Member Selector */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Filters</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Month *</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%'
                }}
                min="2010-01"
                max={`${new Date().getFullYear()}-12`}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Filter by Member</label>
              <select
                value={selectedMember}
                onChange={(e) => {
                  setSelectedMember(e.target.value);
                  setCurrentPage(1);
                }}
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
          {selectedMember && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setSelectedMember('')}
                className="btn btn-secondary"
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                Clear Member Filter
              </button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Commission is calculated on <strong>Principal Amount</strong> (Total Deposits - Total Withdrawals) × Referral %
            </p>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '8px',
              background: groupByReferrer ? '#dbeafe' : '#f8fafc',
              border: `2px solid ${groupByReferrer ? '#3b82f6' : '#e2e8f0'}`,
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                checked={groupByReferrer}
                onChange={(e) => {
                  setGroupByReferrer(e.target.checked);
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#3b82f6'
                }}
              />
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600,
                color: groupByReferrer ? '#1e40af' : '#64748b'
              }}>
                Group by Referrer Name (Show Totals)
              </span>
            </label>
          </div>
        </div>

        {/* Stats Summary */}
        {referralData && (
          <div className="grid" style={{ marginBottom: '24px' }}>
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Total Referrers</p>
                  <h3 style={{ fontSize: '36px', fontWeight: 800, margin: 0 }}>{referralData.referral_commissions.length}</h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}></div>
              </div>
            </div>
            
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Total Commissions</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(referralData.referral_commissions.reduce((sum, r) => sum + r.total_commission, 0))}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}></div>
              </div>
            </div>
            
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Total Referrals</p>
                  <h3 style={{ fontSize: '36px', fontWeight: 800, margin: 0 }}>
                    {referralData.referral_commissions.reduce((sum, r) => sum + r.referred_count, 0)}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Period Info */}
        {referralData && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                  {referralData.period}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                  {formatDate(referralData.start_date)} - {formatDate(referralData.end_date)}
                </p>
              </div>
              <div style={{
                background: '#f0fdf4',
                color: '#166534',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid #bbf7d0'
              }}>
                {flattenedData.length} Commission Records
              </div>
            </div>
          </div>
        )}

        {/* Column Filter Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Column Filters</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setColumnFilters({
                  referrerName: false, referredCount: false, totalCommission: false, memberDetails: false, investmentDate: false,
                  principalAmount: false, withdrawalAmount: false, accountStatus: false, referralPercent: false, commissionAmount: false
                })}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Show All
              </button>
              <button
                onClick={() => setColumnFilters({
                  referrerName: true, referredCount: true, totalCommission: true, memberDetails: true, investmentDate: true,
                  principalAmount: true, withdrawalAmount: true, accountStatus: true, referralPercent: true, commissionAmount: true
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
              referrerName: 'Referrer Name',
              referredCount: 'Total Referred',
              totalCommission: 'Total Commission',
              memberDetails: 'Member Details',
              investmentDate: 'Investment Date',
              principalAmount: 'Principal Amount',
              withdrawalAmount: 'Withdrawal',
              accountStatus: 'Account Status',
              referralPercent: 'Referral %',
              commissionAmount: 'Commission Amount'
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
        </div>

        {/* Referral Data Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Referral Commissions</h2>
            <span style={{ 
              color: '#64748b', 
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              Page {currentPage} of {totalPages || 1} ({flattenedData.length} total records)
            </span>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
            <table className="table">
              <thead>
                <tr>
                  {!columnFilters.referrerName && <th>Referrer Name</th>}
                  {!columnFilters.referredCount && <th>Total Referred</th>}
                  {!columnFilters.totalCommission && <th>Total Commission</th>}
                  {!columnFilters.memberDetails && <th>Member Details</th>}
                  {!columnFilters.investmentDate && <th>Investment Date</th>}
                  {!columnFilters.principalAmount && <th>Principal Amount</th>}
                  {!columnFilters.withdrawalAmount && <th>Withdrawal</th>}
                  {!columnFilters.accountStatus && <th>Account Status</th>}
                  {!columnFilters.referralPercent && <th>Referral %</th>}
                  {!columnFilters.commissionAmount && <th>Commission Amount</th>}
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(columnFilters).filter(v => !v).length || 1} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        No referral data found for {referralData?.period || 'this month'}.
                      </p>
                    </td>
                  </tr>
                ) : Object.values(columnFilters).every(v => v) ? (
                  <tr>
                    <td colSpan={1} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        All columns are hidden. Uncheck some filters to show data.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, index) => (
                    <tr key={`${item.referrer_name}-${item.member_id}-${index}`}>
                      {!columnFilters.referrerName && (
                        <td>
                          <button
                            onClick={() => router.push(`/referral-profile/${encodeURIComponent(item.referrer_name)}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#3b82f6',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '14px',
                              fontWeight: 600
                            }}
                            title="View referral profile"
                          >
                            {item.referrer_name}
                          </button>
                        </td>
                      )}
                      {!columnFilters.referredCount && (
                        <td>
                          <span style={{
                            background: '#f0f9ff',
                            color: '#0369a1',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            {item.referred_count}
                          </span>
                        </td>
                      )}
                      {!columnFilters.totalCommission && (
                        <td style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '16px' }}>
                          {formatCurrency(item.total_commission)}
                        </td>
                      )}
                      {!columnFilters.memberDetails && (
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>
                          {groupByReferrer ? (
                            `${item.member_count || 0} members`
                          ) : (
                            <>
                              {item.member_name}
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                ID: {item.member_id}
                              </div>
                            </>
                          )}
                        </td>
                      )}
                      {!columnFilters.investmentDate && (
                        <td style={{ fontSize: '14px', color: '#475569' }}>
                          {groupByReferrer ? (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          ) : (
                            item.investment_date ? (
                              new Date(item.investment_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )
                          )}
                        </td>
                      )}
                      {!columnFilters.principalAmount && (
                        <td style={{ fontWeight: 700, color: '#10b981', fontSize: '16px' }}>
                          {formatCurrency(groupByReferrer ? (item.total_principal || 0) : item.principal_amount)}
                        </td>
                      )}
                      {!columnFilters.withdrawalAmount && (
                        <td style={{ fontWeight: 600, color: item.withdrawal_amount ? '#ef4444' : '#94a3b8' }}>
                          {groupByReferrer ? (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          ) : item.withdrawal_amount ? (
                            <div>
                              <span>{formatCurrency(item.withdrawal_amount)}</span>
                              {item.withdrawal_dates && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  ({item.withdrawal_dates})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                      )}
                      {!columnFilters.accountStatus && (
                        <td>
                          {groupByReferrer ? (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          ) : (
                            <span style={{
                              background: item.is_account_closed ? '#fef2f2' : '#f0fdf4',
                              color: item.is_account_closed ? '#dc2626' : '#16a34a',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700
                            }}>
                              {item.is_account_closed ? 'Closed' : 'Active'}
                            </span>
                          )}
                        </td>
                      )}
                      {!columnFilters.referralPercent && (
                        <td>
                          {groupByReferrer ? (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          ) : (
                            <span style={{
                              background: '#f0fdf4',
                              color: '#166534',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 600
                            }}>
                              {item.referral_percent}%
                            </span>
                          )}
                        </td>
                      )}
                      {!columnFilters.commissionAmount && (
                        <td style={{ fontWeight: 700, color: '#f59e0b', fontSize: '16px' }}>
                          {formatCurrency(groupByReferrer ? (item.total_commission || 0) : item.commission_amount)}
                        </td>
                      )}
                    </tr>
                  ))
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
