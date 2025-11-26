import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

interface Member {
  id: number;
  name: string;
  unique_number?: number;
  alias_name?: string;
  village?: string;
  town?: string;
  percentage_of_return: number;
  date_of_return: number;
  referral_name?: string;
  referral_percent: number;
  total_deposits: number;
  total_withdrawals: number;
  total_returns: number;
  deposits?: Array<{
    id: number;
    amount: number;
    deposit_date: string;
    percentage?: number | null;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [currentReturns, setCurrentReturns] = useState<Record<number, number>>({});
  const [referralCommissions, setReferralCommissions] = useState<Record<string, number>>({});
  const [totalReferralCommissions, setTotalReferralCommissions] = useState<number>(0);
  const [columnFilters, setColumnFilters] = useState({
    uniqueNumber: false,
    name: false,
    alias: false,
    location: false,
    totalDeposits: false,
    currentReturn: false,
    returnRate: false,
    referral: false,
    actions: false
  });
  const [formData, setFormData] = useState({
    name: '',
    alias_name: '',
    village: '',
    town: '',
    percentage_of_return: '',
    referral_name: '',
    referral_percent: '',
    deposit_amount: '',
    investment_date: '',
    mode_of_payment: ''
  });

  useEffect(() => {
    checkAuth();
    checkAndCalculateMonthlyReturns();
    fetchMembers();
    fetchReferralCommissions();
  }, []);

  const checkAndCalculateMonthlyReturns = async () => {
    try {
      // Always check and calculate returns if it's 2nd of month
      const res = await fetch('/api/calculate-monthly-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.calculated) {
        // Refresh members after calculation
        fetchMembers();
      }
    } catch (error) {
      console.error('Error calculating monthly returns:', error);
    }
  };


  const checkAuth = async () => {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      router.push('/');
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
      setFilteredMembers(data);
      
      // Fetch current returns for each member
      const returnsMap: Record<number, number> = {};
      await Promise.all(data.map(async (member: Member) => {
        try {
          const returnsRes = await fetch('/api/member/current-returns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: member.id })
          });
          const returnsData = await returnsRes.json();
          if (returnsRes.ok) {
            returnsMap[member.id] = returnsData.current_return || 0;
          }
        } catch (error) {
          console.error(`Error fetching returns for member ${member.id}:`, error);
        }
      }));
      setCurrentReturns(returnsMap);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralCommissions = async () => {
    try {
      const res = await fetch('/api/referral-commissions');
      const data = await res.json();
      
      if (res.ok) {
        // Create a map of referrer name to total commission
        const commissionMap: Record<string, number> = {};
        let totalCommissions = 0;
        
        data.referral_commissions.forEach((item: any) => {
          commissionMap[item.referrer_name.toLowerCase()] = item.total_commission;
          totalCommissions += item.total_commission;
        });
        
        setReferralCommissions(commissionMap);
        setTotalReferralCommissions(totalCommissions);
      }
    } catch (error) {
      console.error('Error fetching referral commissions:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredMembers(members);
      return;
    }
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setFilteredMembers(data);
    } catch (error) {
      console.error('Error searching:', error);
      setFilteredMembers(members);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleAdd = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      alias_name: '',
      village: '',
      town: '',
      percentage_of_return: '',
      referral_name: '',
      referral_percent: '',
      deposit_amount: '',
      investment_date: '',
      mode_of_payment: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      alias_name: member.alias_name || '',
      village: member.village || '',
      town: member.town || '',
      percentage_of_return: member.percentage_of_return.toString(),
      referral_name: member.referral_name || '',
      referral_percent: member.referral_percent.toString(),
      deposit_amount: '',
      investment_date: '',
      mode_of_payment: ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMembers();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingMember 
        ? `/api/members/${editingMember.id}`
        : '/api/members';
      
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchMembers();
      } else {
        alert('Failed to save member');
      }
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Failed to save member');
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
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - LakhDatar Fast Grow Pvt Ltd</title>
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
            <button onClick={() => router.push('/master-sheet')} className="btn btn-success">
              📊 Master Sheet
            </button>
            <button onClick={() => router.push('/transactions')} className="btn btn-primary" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white'
            }}>
              💼 Transactions
            </button>
            <button onClick={handleAdd} className="btn btn-primary">
              ➕ Add Member
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {members.length > 0 && (
          <div className="grid" style={{ marginBottom: '24px' }}>
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Total Members</p>
                  <h3 style={{ fontSize: '36px', fontWeight: 800, margin: 0 }}>{members.length}</h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>👥</div>
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
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Total Deposits</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(members.reduce((sum, m) => sum + m.total_deposits, 0))}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>💰</div>
              </div>
            </div>
            
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Total Withdrawals</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(members.reduce((sum, m) => sum + m.total_withdrawals, 0))}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>💸</div>
              </div>
            </div>
            
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Current Balance</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(
                      members.reduce((sum, m) => sum + m.total_deposits, 0) - 
                      members.reduce((sum, m) => sum + m.total_withdrawals, 0)
                    )}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>💵</div>
              </div>
            </div>
            
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>Monthly Referral Commission</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(totalReferralCommissions)}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: '56px', 
                  opacity: 0.3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>🤝</div>
              </div>
            </div>
          </div>
        )}


        {/* Search Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 Search Members
          </h2>
          <input
            type="text"
            placeholder="Search by name, alias, village, town, or unique number..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              background: '#f8fafc',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.background = '#ffffff';
              e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.background = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Column Filter Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>🔧 Column Filters</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setColumnFilters({
                  uniqueNumber: false, name: false, alias: false, location: false,
                  totalDeposits: false, currentReturn: false, returnRate: false, referral: false, actions: false
                })}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Show All
              </button>
              <button
                onClick={() => setColumnFilters({
                  uniqueNumber: true, name: true, alias: true, location: true,
                  totalDeposits: true, currentReturn: true, returnRate: true, referral: true, actions: true
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
              uniqueNumber: 'Unique #',
              name: 'Name',
              alias: 'Alias',
              location: 'Village - Town',
              totalDeposits: 'Total Deposits',
              currentReturn: 'Current Month Return',
              returnRate: 'Default Return %',
              referral: 'Referral',
              actions: 'Actions'
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
              If all columns are checked, table will be empty.
            </p>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Members List</h2>
            <span style={{ 
              color: '#64748b', 
              fontSize: '14px',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 600
            }}>
              {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
            <table className="table">
              <thead>
                <tr>
                  {!columnFilters.uniqueNumber && <th>Unique #</th>}
                  {!columnFilters.name && <th>Name</th>}
                  {!columnFilters.alias && <th>Alias</th>}
                  {!columnFilters.location && <th>Village - Town</th>}
                  {!columnFilters.totalDeposits && <th>Total Deposits</th>}
                  {!columnFilters.currentReturn && <th>Current Month Return</th>}
                  {!columnFilters.returnRate && <th>Default Return %</th>}
                  {!columnFilters.referral && <th>Referral</th>}
                  {!columnFilters.actions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(columnFilters).filter(v => !v).length || 1} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                      <p style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
                        {searchQuery ? 'No members found matching your search.' : 'No members found. Click "Add Member" to add one.'}
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
                  filteredMembers.map((member) => (
                    <tr key={member.id}>
                      {!columnFilters.uniqueNumber && (
                        <td>
                          <span style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700
                          }}>
                            #{member.unique_number || member.id}
                          </span>
                        </td>
                      )}
                      {!columnFilters.name && (
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{member.name}</td>
                      )}
                      {!columnFilters.alias && (
                        <td>{member.alias_name || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                      )}
                      {!columnFilters.location && (
                        <td>
                          {member.village && member.town 
                            ? `${member.village} - ${member.town}`
                            : member.village || member.town || <span style={{ color: '#94a3b8' }}>-</span>}
                        </td>
                      )}
                      {!columnFilters.totalDeposits && (
                        <td style={{ fontWeight: 700, color: '#10b981', fontSize: '16px' }}>
                          {formatCurrency(member.total_deposits)}
                        </td>
                      )}
                      {!columnFilters.currentReturn && (
                        <td style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '16px' }}>
                          {formatCurrency(currentReturns[member.id] || 0)}
                        </td>
                      )}
                      {!columnFilters.returnRate && (
                        <td>
                          <span style={{
                            background: '#f0fdf4',
                            color: '#166534',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            {member.percentage_of_return}%
                          </span>
                        </td>
                      )}
                      {!columnFilters.referral && (
                        <td>
                          {member.referral_name ? (
                            <div style={{ fontSize: '14px' }}>
                              <button
                                onClick={() => router.push(`/referral-profile/${encodeURIComponent(member.referral_name || '')}`)}
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
                                {member.referral_name}
                              </button>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {member.referral_percent}% • Commission: {formatCurrency(referralCommissions[member.referral_name.toLowerCase()] || 0)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                      )}
                      {!columnFilters.actions && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                              onClick={() => router.push(`/member/${member.id}`)}
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                              title="View Details"
                            >
                              👁️ View
                            </button>
                            <button 
                              onClick={() => handleEdit(member)}
                              className="btn btn-success"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                              title="Edit Member"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(member.id)}
                              className="btn btn-danger"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                              title="Delete Member"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="modal" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Alias Name</label>
                  <input
                    type="text"
                    value={formData.alias_name}
                    onChange={(e) => setFormData({ ...formData, alias_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Village</label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Town</label>
                  <input
                    type="text"
                    value={formData.town}
                    onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Percentage of Return *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.percentage_of_return}
                    onChange={(e) => setFormData({ ...formData, percentage_of_return: e.target.value })}
                    required
                    placeholder="e.g., 3 for 3%"
                  />
                </div>

                <div className="form-group">
                  <label>Referral Name</label>
                  <input
                    type="text"
                    value={formData.referral_name}
                    onChange={(e) => setFormData({ ...formData, referral_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Referral Percent</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.referral_percent}
                    onChange={(e) => setFormData({ ...formData, referral_percent: e.target.value })}
                    placeholder="e.g., 0.5 for 0.5%"
                  />
                </div>

                {!editingMember && (
                  <>
                    <div style={{
                      marginTop: '24px',
                      padding: '16px',
                      background: '#eff6ff',
                      borderRadius: '12px',
                      border: '2px solid #3b82f6'
                    }}>
                      <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '16px', 
                        fontWeight: 700, 
                        color: '#1e40af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        💰 Initial Deposit Details
                      </h3>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>Deposit Amount *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.deposit_amount}
                          onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                          required
                          placeholder="Enter deposit amount"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>Investment Date *</label>
                        <input
                          type="date"
                          value={formData.investment_date}
                          onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                          required
                          style={{ fontSize: '16px', padding: '12px' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Mode of Payment *</label>
                        <select
                          value={formData.mode_of_payment}
                          onChange={(e) => setFormData({ ...formData, mode_of_payment: e.target.value })}
                          required
                          style={{ fontSize: '16px', padding: '12px' }}
                        >
                          <option value="">Select payment mode</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingMember ? 'Update' : 'Add'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

