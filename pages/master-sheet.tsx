import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

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

  useEffect(() => {
    checkAuth();
    fetchMembers();
    checkAndCalculateMonthlyReturns();
    fetchTransactions();
  }, []);

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

  const checkAndCalculateMonthlyReturns = async () => {
    try {
      // Always check and calculate returns if it's 2nd of month
      const res = await fetch('/api/calculate-monthly-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.calculated) {
        // Refresh transactions after calculation
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error calculating monthly returns:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      let url = '/api/master-transactions?';
      if (selectedMember) {
        url += `member_id=${selectedMember}&`;
      }
      if (dateFilter.start_date && dateFilter.end_date) {
        url += `start_date=${dateFilter.start_date}&end_date=${dateFilter.end_date}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      // Master sheet shows only returns
      const filteredData = data.filter((t: Transaction) => t.transaction_type === 'return');
      
      setTransactions(filteredData);
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

        {/* Filters */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 700 }}>🔍 Filters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Start Date</label>
              <input
                type="date"
                value={dateFilter.start_date}
                onChange={(e) => setDateFilter({ ...dateFilter, start_date: e.target.value })}
                style={{ fontSize: '16px', padding: '12px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>End Date</label>
              <input
                type="date"
                value={dateFilter.end_date}
                onChange={(e) => setDateFilter({ ...dateFilter, end_date: e.target.value })}
                style={{ fontSize: '16px', padding: '12px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Filter by Member</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                style={{ fontSize: '16px', padding: '12px' }}
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
          {(dateFilter.start_date || dateFilter.end_date || selectedMember) && (
            <button
              onClick={() => {
                setDateFilter({ start_date: '', end_date: '' });
                setSelectedMember('');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Returns Details</h2>
            <span style={{ 
              color: '#64748b', 
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              {transactions.length} returns
            </span>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Member Details</th>
                  <th>Village - Town</th>
                  <th>Return Rate</th>
                  <th>Days</th>
                  <th>Return Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        No returns found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={`${transaction.transaction_type}-${transaction.id}`}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            {formatDate(transaction.date)}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 600
                          }}>
                            2nd
                          </span>
                        </div>
                      </td>
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
                      <td style={{ fontSize: '13px', color: '#475569' }}>
                        {(transaction as any).village && (transaction as any).town 
                          ? `${(transaction as any).village} - ${(transaction as any).town}`
                          : (transaction as any).village || (transaction as any).town || 
                            <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
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
                      <td>
                        {(transaction as any).interest_days ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              background: '#eff6ff',
                              color: '#1e40af',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '15px',
                              fontWeight: 700,
                              border: '1px solid #bfdbfe',
                              textAlign: 'center'
                            }}>
                              {(transaction as any).interest_days} days
                            </span>
                            <span style={{ 
                              fontSize: '10px', 
                              color: '#64748b', 
                              textAlign: 'center',
                              fontWeight: 500
                            }}>
                              {(transaction as any).interest_days < 30 ? '(First month)' : '(Full month)'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{
                        color: '#3b82f6',
                        fontWeight: 800,
                        fontSize: '18px'
                      }}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {transaction.notes || <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

