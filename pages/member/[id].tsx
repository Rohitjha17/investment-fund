import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { formatDateForInput } from '@/lib/utils';

interface Member {
  id: number;
  name: string;
  alias_name?: string;
  village?: string;
  town?: string;
  percentage_of_return: number;
  date_of_return: number;
  referral_name?: string;
  referral_percent: number;
  deposits: any[];
  withdrawals: any[];
  returns: any[];
}

export default function MemberDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [currentReturn, setCurrentReturn] = useState<{ amount: number; period_info: string } | null>(null);
  const [depositBreakdown, setDepositBreakdown] = useState<Record<number, number>>({});
  const [depositsPage, setDepositsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [returnsPage, setReturnsPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    date: '',
    notes: '',
    interest_days: '30',
    percentage: ''
  });

  useEffect(() => {
    if (id) {
      checkAuth();
      fetchMember();
    }
  }, [id]);

  // Removed checkAndCalculateMonthlyReturns - it should only run on 2nd of month, not on every page load

  const checkAuth = async () => {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      router.push('/');
    }
  };

  const fetchMember = async () => {
    try {
      setMemberError(null);
      const res = await fetch(`/api/members/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch member');
      }

      setMember({
        ...data,
        deposits: Array.isArray(data.deposits) ? data.deposits : [],
        withdrawals: Array.isArray(data.withdrawals) ? data.withdrawals : [],
        returns: Array.isArray(data.returns) ? data.returns : []
      });

      // Fetch current returns
      try {
        const returnsRes = await fetch('/api/member/current-returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: data.id })
        });
        const returnsData = await returnsRes.json();
        if (returnsRes.ok) {
          setCurrentReturn({
            amount: returnsData.current_return || 0,
            period_info: returnsData.period_info || ''
          });
          
          // Store deposit breakdown
          if (returnsData.deposit_breakdown && Array.isArray(returnsData.deposit_breakdown)) {
            const breakdown: Record<number, number> = {};
            returnsData.deposit_breakdown.forEach((item: any) => {
              breakdown[item.deposit_id] = item.interest;
            });
            setDepositBreakdown(breakdown);
          }
        }
      } catch (error) {
        console.error('Error fetching current returns:', error);
      }
    } catch (error) {
      console.error('Error fetching member:', error);
      setMemberError(
        error instanceof Error
          ? error.message
          : 'Unable to load this member right now.'
      );
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (type: 'deposit' | 'withdrawal') => {
    try {
      const endpoint = type === 'deposit' ? '/api/deposits' : '/api/withdrawals';
      
      const body: any = {
        member_id: id,
        notes: transactionForm.notes
      };

      if (type === 'deposit') {
        body.amount = transactionForm.amount;
        body.deposit_date = transactionForm.date;
        if ((transactionForm as any).percentage) {
          body.percentage = (transactionForm as any).percentage;
        }
      } else {
        body.amount = transactionForm.amount;
        body.withdrawal_date = transactionForm.date;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowDepositModal(false);
        setShowWithdrawalModal(false);
        setTransactionForm({ amount: '', date: '', notes: '', interest_days: '30', percentage: '' });
        fetchMember();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to add ${type}: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error adding ${type}:`, error);
      alert(`Failed to add ${type}. Please check console for details.`);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Pagination helper function
  const renderPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (currentPage > 1) {
      pages.push(
        <button
          key="prev"
          onClick={() => setPage(currentPage - 1)}
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

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPage(i)}
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

    if (currentPage < totalPages) {
      pages.push(
        <button
          key="next"
          onClick={() => setPage(currentPage + 1)}
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
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        gap: '16px'
      }}>
        <div style={{
          fontSize: '48px'
        }}></div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Unable to load member</h1>
        <p style={{ color: '#64748b', maxWidth: '480px' }}>
          {memberError || 'An unexpected error occurred while loading this member. Please try again later.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={fetchMember} className="btn btn-primary">
            🔄 Retry
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalDeposits = member.deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalWithdrawals = member.withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const currentBalance = totalDeposits - totalWithdrawals;

  return (
    <>
      <Head>
        <title>{member.name} - LakhDatar Fast Grow Pvt Ltd</title>
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
              {member.name} {member.alias_name && `(${member.alias_name})`}
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Unique #: #{(member as any).unique_number || member.id}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowDepositModal(true)} className="btn btn-success">
              Add Deposit
            </button>
            <button onClick={() => setShowWithdrawalModal(true)} className="btn btn-danger">
              Add Withdrawal
            </button>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 700 }}>Member Information</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <p><strong style={{ color: '#64748b' }}>Unique #:</strong> 
                <span style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginLeft: '8px'
                }}>
                  #{(member as any).unique_number || member.id}
                </span>
              </p>
              <p><strong style={{ color: '#64748b' }}>Name:</strong> <span style={{ fontWeight: 600 }}>{member.name}</span></p>
              {member.alias_name && <p><strong style={{ color: '#64748b' }}>Alias:</strong> {member.alias_name}</p>}
              {member.village && <p><strong style={{ color: '#64748b' }}>Village:</strong> {member.village}</p>}
              {member.town && <p><strong style={{ color: '#64748b' }}>Town:</strong> {member.town}</p>}
              <p><strong style={{ color: '#64748b' }}>Return %:</strong> 
                <span style={{
                  background: '#f0fdf4',
                  color: '#166534',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginLeft: '8px'
                }}>
                  {member.percentage_of_return}%
                </span>
              </p>
              <p><strong style={{ color: '#64748b' }}>Date of Return:</strong> {member.date_of_return} days</p>
              {member.referral_name && (
                <>
                  <p><strong style={{ color: '#64748b' }}>Referral:</strong> {member.referral_name}</p>
                  <p><strong style={{ color: '#64748b' }}>Referral %:</strong> {member.referral_percent}%</p>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none'
          }}>
            <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '20px', fontWeight: 700 }}>Financial Summary</h3>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                padding: '12px', 
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Deposits</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{formatCurrency(totalDeposits)}</p>
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                padding: '12px', 
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Withdrawals</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{formatCurrency(totalWithdrawals)}</p>
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                padding: '12px', 
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Current Balance</p>
                <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{formatCurrency(currentBalance)}</p>
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                padding: '12px', 
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Current Month Return</p>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                  {currentReturn ? formatCurrency(currentReturn.amount) : '₹0'}
                </p>
                {currentReturn && currentReturn.period_info && (
                  <p style={{ fontSize: '10px', opacity: 0.8, margin: '4px 0 0 0' }}>
                    {currentReturn.period_info}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Deposits</h2>
            <span style={{ 
              color: '#64748b', 
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              {member.deposits.length} total
            </span>
          </div>
          {member.deposits.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No deposits found.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Interest Rate</th>
                      <th>Current Month Interest</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sortedDeposits = [...member.deposits].sort((a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime());
                      const totalPages = Math.ceil(sortedDeposits.length / itemsPerPage);
                      const startIndex = (depositsPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentDeposits = sortedDeposits.slice(startIndex, endIndex);
                      
                      return currentDeposits.map((deposit, index) => {
                      const depositRate = deposit.percentage !== null && deposit.percentage !== undefined 
                        ? deposit.percentage 
                        : member.percentage_of_return;
                      
                      // Get current month interest from API breakdown
                      const currentMonthInterest = depositBreakdown[deposit.id] || 0;
                      
                        return (
                          <tr key={deposit.id}>
                            <td style={{ fontWeight: 600, color: '#64748b' }}>Deposit {startIndex + index + 1}</td>
                          <td style={{ fontWeight: 500 }}>{formatDate(deposit.deposit_date)}</td>
                          <td style={{ fontWeight: 700, color: '#10b981', fontSize: '16px' }}>
                            {formatCurrency(deposit.amount)}
                          </td>
                          <td>
                            <span style={{
                              background: deposit.percentage !== null && deposit.percentage !== undefined
                                ? '#fef3c7'
                                : '#f0fdf4',
                              color: deposit.percentage !== null && deposit.percentage !== undefined
                                ? '#92400e'
                                : '#166534',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 700,
                              border: deposit.percentage !== null && deposit.percentage !== undefined
                                ? '2px solid #fbbf24'
                                : 'none'
                            }}>
                              {depositRate}%
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '15px' }}>
                            {formatCurrency(currentMonthInterest)}
                          </td>
                          <td>{deposit.notes || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                        </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const totalPages = Math.ceil(member.deposits.length / itemsPerPage);
                return renderPagination(depositsPage, totalPages, setDepositsPage);
              })()}
            </>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Withdrawals</h2>
            <span style={{ 
              color: '#64748b', 
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              {member.withdrawals.length} total
            </span>
          </div>
          {member.withdrawals.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No withdrawals found.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sortedWithdrawals = [...member.withdrawals].sort((a, b) => new Date(a.withdrawal_date).getTime() - new Date(b.withdrawal_date).getTime());
                      const totalPages = Math.ceil(sortedWithdrawals.length / itemsPerPage);
                      const startIndex = (withdrawalsPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentWithdrawals = sortedWithdrawals.slice(startIndex, endIndex);
                      
                      return currentWithdrawals.map((withdrawal, index) => (
                        <tr key={withdrawal.id}>
                          <td style={{ fontWeight: 600, color: '#64748b' }}>#{startIndex + index + 1}</td>
                        <td style={{ fontWeight: 500 }}>{formatDate(withdrawal.withdrawal_date)}</td>
                        <td style={{ fontWeight: 700, color: '#ef4444', fontSize: '16px' }}>
                          {formatCurrency(withdrawal.amount)}
                        </td>
                          <td>{withdrawal.notes || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const totalPages = Math.ceil(member.withdrawals.length / itemsPerPage);
                return renderPagination(withdrawalsPage, totalPages, setWithdrawalsPage);
              })()}
            </>
          )}
        </div>

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="modal" onClick={() => setShowDepositModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Deposit</h2>
                <button className="close-btn" onClick={() => setShowDepositModal(false)}>×</button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleTransactionSubmit('deposit'); }}>
                <div style={{
                  padding: '12px',
                  background: '#eff6ff',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #bfdbfe'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                    <strong>How it works:</strong><br/>
                    • Interest starts from <strong>next day</strong> after deposit<br/>
                    • Returns calculated automatically on <strong>2nd of every month</strong><br/>
                    • Custom rate applies only to this deposit
                  </p>
                </div>
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Interest Rate % (Optional - Leave empty for member's default {member.percentage_of_return}%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(transactionForm as any).percentage || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, percentage: e.target.value })}
                    placeholder={`Default: ${member.percentage_of_return}%`}
                  />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={transactionForm.date || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    required
                    style={{ fontSize: '16px', padding: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Deposit</button>
              </form>
            </div>
          </div>
        )}

        {/* Withdrawal Modal */}
        {showWithdrawalModal && (
          <div className="modal" onClick={() => setShowWithdrawalModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Withdrawal</h2>
                <button className="close-btn" onClick={() => setShowWithdrawalModal(false)}>×</button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleTransactionSubmit('withdrawal'); }}>
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={transactionForm.date || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    required
                    style={{ fontSize: '16px', padding: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Withdrawal</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

