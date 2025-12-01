import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface ReferralData {
  referrer_name: string;
  total_commission: number;
  referred_count: number;
  breakdown: Array<{
    member_id: number;
    member_name: string;
    interest_earned: number;
    referral_percent: number;
    commission_amount: number;
    is_direct: boolean;
  }>;
}

export default function ReferralProfile() {
  const router = useRouter();
  const { name } = router.query;
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    if (name) {
      checkAuth();
      fetchReferralData();
    }
  }, [name]);

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
      setError(null);

      // Fetch all referral commissions
      const res = await fetch('/api/referral-commissions');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch referral data');
      }

      // Find the specific referrer's data
      const referrerData = data.referral_commissions.find((r: ReferralData) => 
        r.referrer_name.toLowerCase() === (name as string).toLowerCase()
      );

      if (!referrerData) {
        setError(`No referral data found for "${name}"`);
      } else {
        setReferralData(referrerData);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Pagination logic
  const breakdown = referralData?.breakdown || [];
  const totalPages = Math.ceil(breakdown.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBreakdown = breakdown.slice(startIndex, endIndex);

  const renderPagination = () => {
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="spinner"></div>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Loading referral profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <Head>
          <title>Referral Profile - Error</title>
        </Head>
        
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>❌</div>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '16px' }}>{error}</p>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '16px' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <Head>
        <title>Referral Profile - {referralData?.referrer_name}</title>
      </Head>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            color: '#1e293b',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {referralData?.referrer_name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
            Referral Commission Profile
          </p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="btn btn-secondary"
          style={{ padding: '12px 20px', fontSize: '14px' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '32px' 
      }}>
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            Total Commission
          </h3>
          <p style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {formatCurrency(referralData?.total_commission || 0)}
          </p>
          <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px', margin: 0 }}>
            Current Month Earnings
          </p>
        </div>

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          color: 'white',
          border: 'none'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            Total Referrals
          </h3>
          <p style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {referralData?.referred_count || 0}
          </p>
          <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px', margin: 0 }}>
            Active Members Referred
          </p>
        </div>

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
            Average Commission
          </h3>
          <p style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {referralData?.referred_count ? 
              formatCurrency((referralData.total_commission || 0) / referralData.referred_count) : 
              formatCurrency(0)
            }
          </p>
          <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px', margin: 0 }}>
            Per Referral This Month
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Commission Breakdown
          </h3>
          <span style={{ 
            color: '#64748b', 
            fontSize: '14px',
            background: '#f1f5f9',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 600
          }}>
            Page {currentPage} of {totalPages || 1} ({breakdown.length} total records)
          </span>
        </div>

        {referralData?.breakdown && referralData.breakdown.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      fontWeight: 700, 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Member
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      fontWeight: 700, 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Type
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'right', 
                      fontWeight: 700, 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Interest Earned
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      fontWeight: 700, 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Commission %
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'right', 
                      fontWeight: 700, 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Commission Amount
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      fontWeight: 700, 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentBreakdown
                    .sort((a, b) => b.commission_amount - a.commission_amount)
                    .map((item, index) => (
                  <tr 
                    key={item.member_id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div>
                        <p style={{ 
                          fontWeight: 600, 
                          color: '#1e293b', 
                          margin: 0,
                          fontSize: '15px'
                        }}>
                          {item.member_name}
                        </p>
                        <p style={{ 
                          fontSize: '13px', 
                          color: '#64748b', 
                          margin: '4px 0 0 0'
                        }}>
                          ID: #{item.member_id}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        background: item.is_direct ? '#f0f9ff' : '#fef3c7',
                        color: item.is_direct ? '#0369a1' : '#92400e',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: item.is_direct ? '1px solid #bae6fd' : '1px solid #fde68a'
                      }}>
                        {item.is_direct ? 'Direct' : 'Indirect'}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#059669',
                      fontSize: '15px'
                    }}>
                      {formatCurrency(item.interest_earned)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: '1px solid #bbf7d0'
                      }}>
                        {item.referral_percent}%
                      </span>
                    </td>
                    <td style={{ 
                      padding: '16px', 
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#8b5cf6',
                      fontSize: '16px'
                    }}>
                      {formatCurrency(item.commission_amount)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => router.push(`/member/${item.member_id}`)}
                        className="btn btn-primary"
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '13px',
                          minWidth: 'auto'
                        }}
                        title="View Member Details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>
              No referral commissions found for this month.
            </p>
          </div>
        )}
      </div>

      {/* Note */}
      <div style={{ 
        marginTop: '24px',
        padding: '16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px'
      }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#64748b', 
          margin: 0,
          lineHeight: '1.5'
        }}>
          <strong>Note:</strong> Commission amounts are calculated based on the current month's interest earnings 
          of referred members. Commissions are updated automatically each month along with member returns.
        </p>
      </div>
    </div>
  );
}
