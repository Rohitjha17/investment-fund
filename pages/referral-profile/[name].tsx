import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface ReferredMember {
  id: number;
  name: string;
  alias_name?: string;
  village?: string;
  town?: string;
  total_deposits: number;
  percentage_of_return: number;
  referral_percent: number;
  current_return: number;
  referral_income: number;
}

export default function ReferralProfile() {
  const router = useRouter();
  const { name } = router.query;
  const [referredMembers, setReferredMembers] = useState<ReferredMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReferralIncome, setTotalReferralIncome] = useState(0);
  const [referrerName, setReferrerName] = useState('');

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
      
      // First, find the referrer by name
      const membersRes = await fetch('/api/members');
      const allMembers = await membersRes.json();
      
      const referrer = allMembers.find((m: any) => m.name === name);
      if (!referrer) {
        console.error('Referrer not found');
        setLoading(false);
        return;
      }

      setReferrerName(referrer.name);

      // Get all members referred by this person
      const referredList = allMembers.filter((m: any) => m.referral_name === name);
      
      // Fetch detailed data for each referred member
      const detailedReferredMembers: ReferredMember[] = [];
      let totalIncome = 0;

      for (const member of referredList) {
        try {
          // Fetch current returns
          const returnsRes = await fetch('/api/member/current-returns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: member.id })
          });
          const returnsData = await returnsRes.json();
          const currentReturn = returnsData.current_return || 0;

          // Calculate referral income for this member
          const referralIncome = (currentReturn * (member.referral_percent || 0)) / 100;
          totalIncome += referralIncome;

          detailedReferredMembers.push({
            id: member.id,
            name: member.name,
            alias_name: member.alias_name,
            village: member.village,
            town: member.town,
            total_deposits: member.total_deposits || 0,
            percentage_of_return: member.percentage_of_return || 0,
            referral_percent: member.referral_percent || 0,
            current_return: currentReturn,
            referral_income: referralIncome
          });
        } catch (error) {
          console.error(`Error fetching data for member ${member.id}:`, error);
        }
      }

      // Sort alphabetically by name
      detailedReferredMembers.sort((a, b) => a.name.localeCompare(b.name));
      
      setReferredMembers(detailedReferredMembers);
      setTotalReferralIncome(totalIncome);
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Referral Profile - LakhDatar Fast Grow Pvt Ltd</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ fontSize: '18px', fontWeight: 600 }}>Loading referral profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{referrerName} - Referral Profile - LakhDatar Fast Grow Pvt Ltd</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 700, color: '#1e293b' }}>
                  🤝 {referrerName}'s Referral Profile
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
                  Complete overview of referred members and commission earnings
                </p>
              </div>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
              >
                ← Back
              </button>
            </div>

            {/* Summary Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px' 
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                  {referredMembers.length}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Referred Members</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>💰</div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                  {formatCurrency(totalReferralIncome)}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Commission Earned</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📊</div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                  {referredMembers.length > 0 ? 
                    formatCurrency(Math.round(totalReferralIncome / referredMembers.length)) : 
                    formatCurrency(0)
                  }
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Average Commission per Member</div>
              </div>
            </div>
          </div>

          {/* Referred Members List */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
              📋 Referred Members Details
            </h2>

            {referredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤷‍♂️</div>
                <p style={{ fontSize: '18px', color: '#64748b', fontWeight: 500 }}>
                  No referred members found for {referrerName}.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Alias</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Location</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Total Deposits</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Current Return</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Commission %</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Commission Earned</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredMembers.map((member, index) => (
                      <tr key={member.id} style={{ 
                        borderBottom: index < referredMembers.length - 1 ? '1px solid #e5e7eb' : 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px', fontWeight: 600, color: '#1e293b' }}>
                          {member.name}
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {member.alias_name || <span style={{ color: '#94a3b8' }}>-</span>}
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {member.village && member.town 
                            ? `${member.village} - ${member.town}`
                            : member.village || member.town || <span style={{ color: '#94a3b8' }}>-</span>}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                          {formatCurrency(member.total_deposits)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#8b5cf6' }}>
                          {formatCurrency(member.current_return)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            {member.referral_percent}%
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#f59e0b', fontSize: '16px' }}>
                          {formatCurrency(member.referral_income)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => router.push(`/member/${member.id}`)}
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}
                            title="View member details"
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
