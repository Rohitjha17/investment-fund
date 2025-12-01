import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

interface Transaction {
  id: number;
  type: 'deposit' | 'withdrawal' | 'return';
  member_name: string;
  alias_name?: string;
  amount: number;
  date: string;
  notes?: string;
}

export default function Transactions() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    checkAuth();
    fetchTransactions();
  }, []);

  const checkAuth = async () => {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      router.push('/');
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions/all');
      const data = await res.json();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        console.error('Invalid data format:', data);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Loading transactions...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>All Transactions - LakhDatar Fast Grow Pvt Ltd</title>
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
                All Transactions
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Complete transaction history</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Transaction History</h2>
            <span style={{ 
              color: '#64748b', 
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              Page {currentPage} of {totalPages || 1} ({transactions.length} total transactions)
            </span>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        No transactions found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  Array.isArray(currentTransactions) && currentTransactions.map((transaction, index) => {
                    const transactionType = transaction.type || (transaction as any).transaction_type || 'deposit';
                    return (
                      <tr key={`${transactionType}-${transaction.id}-${index}`}>
                        <td style={{ fontWeight: 500 }}>{formatDate(transaction.date)}</td>
                        <td>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            background: transactionType === 'deposit' 
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : transactionType === 'withdrawal'
                              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}>
                            {transactionType ? transactionType.toUpperCase() : 'UNKNOWN'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {transaction.member_name || 'Unknown'}
                          {transaction.alias_name && ` (${transaction.alias_name})`}
                        </td>
                        <td style={{
                          color: transactionType === 'deposit' ? '#10b981' :
                                transactionType === 'withdrawal' ? '#ef4444' : '#3b82f6',
                          fontWeight: 700,
                          fontSize: '16px'
                        }}>
                          {transactionType === 'withdrawal' ? '-' : '+'}
                          {formatCurrency(Math.abs(transaction.amount || 0))}
                        </td>
                        <td>{transaction.notes || <span style={{ color: '#94a3b8' }}>-</span>}</td>
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

