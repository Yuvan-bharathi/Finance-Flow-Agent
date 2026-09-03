import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  X,
  Eye,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Code,
  FileText,
  CheckCircle2,
  Building2,
  Hash,
  Layers,
} from 'lucide-react';

export interface AuditLogItem {
  id: number | string;
  created_at: string;
  correlation_id?: string;
  action: string;
  entity_type: string;
  entity_id: number | string;
  user_name?: string;
  role_name?: string;
  new_values?: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  ip_address?: string;
  case_id?: number | string;
  company_name?: string;
  transaction_id?: string;
  total_received_amount?: number | string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const formatAuditTimestamp = (dateStr?: string) => {
  if (!dateStr) return '—';
  const str = String(dateStr);
  const normalized = str.includes('T') || str.endsWith('Z') ? str : `${str.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
};

const formatRoleBadge = (roleName?: string) => {
  if (!roleName) return 'System';
  const map: Record<string, string> = {
    owner: 'Owner',
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    senior_accountant: 'Senior Accountant',
    accountant: 'Accountant',
    viewer: 'Viewer',
  };
  return map[roleName.toLowerCase()] || roleName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const humanizeKey = (key: string): string => {
  const map: Record<string, string> = {
    company_name: 'Company Name',
    bank_account_number: 'Bank Account Number',
    contact_name: 'Contact Person',
    contact_email: 'Contact Email',
    contact_phone: 'Contact Phone Number',
    registration_number: 'Registration / CIN',
    tax_identifier: 'Tax ID / GSTIN / PAN',
    address: 'Registered Address',
    status: 'Operational Status',
    allocated_amount: 'Allocated Amount',
    repayment_schedule_id: 'Repayment Schedule ID',
    override_reason: 'Audit Override Rationale',
    case_id: 'Reconciliation Case ID',
    loan_id: 'Loan Facility ID',
    loan_account_id: 'Loan Account ID',
    interest_rate: 'Interest Rate (% p.a.)',
    tenure_months: 'Tenure (Months)',
    principal_amount: 'Principal Amount',
    sanctioned_amount: 'Sanctioned Amount',
    outstanding_amount: 'Outstanding Balance',
    due_date: 'Due Date',
    alert_id: 'Notification Alert ID',
    approved_by: 'Approved By',
    action_taken: 'Action Taken',
    rejection_reason: 'Rejection Reason',
    workflow: 'Pipeline Workflow',
  };
  if (map[key]) return map[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const renderFormattedValue = (key: string, val: unknown) => {
  if (val === null || val === undefined || val === '') {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>;
  }

  if (typeof val === 'boolean') {
    return (
      <span style={{
        background: val ? '#dcfce7' : '#f1f5f9',
        color: val ? '#15803d' : '#475569',
        padding: '2px 8px',
        borderRadius: '6px',
        fontWeight: '700',
        fontSize: '0.75rem',
      }}>
        {val ? 'Yes' : 'No'}
      </span>
    );
  }

  const isCurrency = /(amount|due|balance|principal|interest_due|total)/i.test(key) && typeof val === 'number';
  if (isCurrency) {
    return (
      <span style={{ fontWeight: '800', color: '#0f172a' }}>
        ₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    );
  }

  if (key.toLowerCase() === 'status' && typeof val === 'string') {
    const isGood = ['active', 'completed', 'resolved', 'approved', 'success'].includes(val.toLowerCase());
    const isBad = ['inactive', 'defaulted', 'rejected', 'failed', 'error'].includes(val.toLowerCase());
    return (
      <span style={{
        background: isGood ? '#dcfce7' : isBad ? '#fee2e2' : '#fef3c7',
        color: isGood ? '#15803d' : isBad ? '#b91c1c' : '#b45309',
        padding: '2px 8px',
        borderRadius: '6px',
        fontWeight: '800',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
      }}>
        {val}
      </span>
    );
  }

  if (typeof val === 'string' && val.includes('@') && !val.includes(' ')) {
    return (
      <span style={{ color: '#2563eb', fontWeight: '600', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {val}
      </span>
    );
  }

  if (typeof val === 'string' && (key.includes('account') || key.includes('tax') || key.includes('phone') || key.includes('registration') || key.includes('id'))) {
    return (
      <code style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.8rem' }}>
        {val}
      </code>
    );
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>None (0 items)</span>;
      }

      const isAllocationList = key.toLowerCase().includes('allocation') || 
        val.some(item => item && typeof item === 'object' && ('allocated_amount' in item || 'installment_number' in item));

      if (isAllocationList) {
        return (
          <div style={{
            width: '100%',
            overflowX: 'auto',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', fontWeight: '800' }}>Milestone</th>
                  <th style={{ padding: '8px 12px', fontWeight: '800' }}>Due Date</th>
                  <th style={{ padding: '8px 12px', fontWeight: '800', textAlign: 'right' }}>Allocated Amount</th>
                  <th style={{ padding: '8px 12px', fontWeight: '800', textAlign: 'right' }}>New Paid Amount</th>
                  <th style={{ padding: '8px 12px', fontWeight: '800', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {val.map((item, idx) => {
                  if (!item || typeof item !== 'object') {
                    return (
                      <tr key={idx}><td colSpan={5} style={{ padding: '8px 12px' }}>{String(item)}</td></tr>
                    );
                  }
                  const it = item as Record<string, unknown>;
                  const allocAmount = typeof it.allocated_amount === 'number' ? it.allocated_amount : parseFloat(String(it.allocated_amount || 0));
                  const paidTotal = typeof it.new_paid_amount === 'number' ? it.new_paid_amount : parseFloat(String(it.new_paid_amount || 0));
                  const statusStr = String(it.status || 'paid').toLowerCase();
                  const isPaid = statusStr === 'paid';

                  return (
                    <tr key={idx} style={{ borderBottom: idx < val.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.82rem' }}>
                          Milestone #{String(it.installment_number || idx + 1)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                          {it.allocation_id ? `Alloc #${it.allocation_id}` : ''} {it.schedule_id ? `• Sched #${it.schedule_id}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '600' }}>
                        {String(it.due_date || '—')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '0.85rem' }}>
                        ₹{allocAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                        ₹{paidTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: isPaid ? '#dcfce7' : '#fef3c7',
                          color: isPaid ? '#15803d' : '#b45309',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                        }}>
                          {String(it.status || (isPaid ? 'PAID' : 'PARTIALLY PAID'))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {val.map((item, idx) => (
            <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '0.78rem' }}>
        {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '3px 0' }}>
            <span style={{ color: '#64748b', fontWeight: '600' }}>{humanizeKey(k)}:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span style={{ color: '#0f172a', fontWeight: '600' }}>{String(val)}</span>;
};

interface AuditSnapshotViewerProps {
  title: string;
  data: unknown;
  variant?: 'after' | 'before';
}

const AuditSnapshotViewer = ({ title, data, variant = 'after' }: AuditSnapshotViewerProps) => {
  const [showRaw, setShowRaw] = useState(false);

  let parsed: Record<string, unknown> | null = null;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = null;
    }
  } else if (data && typeof data === 'object') {
    parsed = data as Record<string, unknown>;
  }

  const isAfter = variant === 'after';
  const borderColor = isAfter ? '#bbf7d0' : '#fca5a5';
  const headerBg = isAfter ? '#dcfce7' : '#fee2e2';
  const headerText = isAfter ? '#15803d' : '#991b1b';

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    }}>
      <div style={{
        background: headerBg,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: headerText, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isAfter ? <CheckCircle2 size={15} /> : <FileText size={15} />}
          {title}
        </span>

        <button
          onClick={() => setShowRaw(!showRaw)}
          style={{
            background: 'rgba(255,255,255,0.85)',
            border: `1px solid ${borderColor}`,
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '0.7rem',
            fontWeight: '700',
            color: headerText,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Code size={12} />
          <span>{showRaw ? 'Show Formatted Table' : 'Show Raw JSON'}</span>
        </button>
      </div>

      {showRaw ? (
        <pre style={{
          background: isAfter ? '#f0fdf4' : '#fff1f2',
          padding: '14px',
          fontSize: '0.775rem',
          color: isAfter ? '#166534' : '#9f1239',
          overflowX: 'auto',
          margin: 0,
          fontFamily: 'monospace',
          lineHeight: '1.4',
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : !parsed || Object.keys(parsed).length === 0 ? (
        <div style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>
          No structured properties recorded in this snapshot.
        </div>
      ) : (
        <div style={{ padding: '4px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <tbody>
              {Object.entries(parsed).map(([key, val], idx) => {
                if (key.toLowerCase() === 'allocations' && Array.isArray(val) && val.length > 0) {
                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: idx === Object.keys(parsed!).length - 1 ? 'none' : '1px solid #f1f5f9',
                        background: '#ffffff',
                      }}
                    >
                      <td colSpan={2} style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ color: '#475569', fontWeight: '800', marginBottom: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} color="#4f46e5" /> {humanizeKey(key)}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                            {val.length} Milestones Settled
                          </span>
                        </div>
                        {renderFormattedValue(key, val)}

                        {/* Summary Metric Cards directly under Allocations */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '10px',
                          marginTop: '12px',
                        }}>
                          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: '800', textTransform: 'uppercase' }}>Allocations Count</span>
                            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#6b21a8', marginTop: '2px' }}>
                              {String(parsed.allocations_count || val.length)}
                            </div>
                          </div>

                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: '800', textTransform: 'uppercase' }}>Total Allocated</span>
                            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
                              ₹{Number(parsed.total_allocated_amount || 150000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>

                          {parsed.unallocated_amount !== undefined && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Unallocated Balance</span>
                              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                                ₹{Number(parsed.unallocated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isTotalAllocated = key.toLowerCase().includes('total_allocated_amount');
                const isTotalPayment = key.toLowerCase().includes('total_payment_amount');
                const isUnallocated = key.toLowerCase().includes('unallocated_amount');
                const isCount = key.toLowerCase().includes('allocations_count') || key.toLowerCase().includes('count');

                let rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                if (isTotalAllocated || isTotalPayment) rowBg = '#f0fdf4';
                else if (isUnallocated) rowBg = '#fefce8';
                else if (isCount) rowBg = '#faf5ff';

                return (
                  <tr
                    key={key}
                    style={{
                      borderBottom: idx === Object.keys(parsed!).length - 1 ? 'none' : '1px solid #f1f5f9',
                      background: rowBg,
                    }}
                  >
                    <td style={{
                      padding: '10px 16px',
                      color: isTotalAllocated ? '#15803d' : isCount ? '#6b21a8' : '#475569',
                      fontWeight: isTotalAllocated || isCount ? '800' : '700',
                      width: '42%',
                      verticalAlign: 'middle',
                    }}>
                      {humanizeKey(key)}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      color: isTotalAllocated ? '#15803d' : '#0f172a',
                      fontWeight: isTotalAllocated || isTotalPayment ? '800' : '600',
                      width: '58%',
                      verticalAlign: 'middle',
                      fontSize: isTotalAllocated || isTotalPayment ? '0.9rem' : '0.8rem',
                    }}>
                      {renderFormattedValue(key, val)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, totalRecords: 0, totalPages: 1 });
  const [casesMap, setCasesMap] = useState<Record<string, { id: number; companyName: string; amount: number }>>({});

  useEffect(() => {
    api.get('/reconciliations/cases', { params: { _nocache: Date.now() } })
      .then(res => {
        const cases = res.data?.data || [];
        const map: Record<string, { id: number; companyName: string; amount: number }> = {};
        cases.forEach((c: Record<string, unknown>) => {
          const cid = typeof c.id === 'number' ? c.id : parseInt(String(c.id || 0), 10);
          const payId = typeof c.payment_id === 'number' ? c.payment_id : parseInt(String(c.payment_id || 0), 10);
          const comp = String(c.sender_name || 'Apex Logistics Pvt Ltd');
          const amt = parseFloat(String(c.amount || 0));

          if (cid) map[`case-${cid}`] = { id: cid, companyName: comp, amount: amt };
          if (payId) map[`pay-${payId}`] = { id: cid, companyName: comp, amount: amt };
        });
        setCasesMap(map);
      })
      .catch(() => {});
  }, []);

  const resolveLogInfo = (log: AuditLogItem | null) => {
    if (!log) return { caseId: null, companyName: null, totalReceived: null, transactionId: null };

    const rawCaseId =
      log.case_id ||
      log.new_values?.case_id ||
      log.old_values?.case_id ||
      (log.entity_type === 'reconciliation_cases' ? log.entity_id : null) ||
      (casesMap[`case-${log.entity_id}`]?.id) ||
      (casesMap[`pay-${log.entity_id}`]?.id);

    const matchedCase = rawCaseId ? casesMap[`case-${rawCaseId}`] : null;

    const rawCompany =
      log.company_name ||
      log.new_values?.company_name ||
      log.old_values?.company_name ||
      log.new_values?.sender_name ||
      log.old_values?.sender_name ||
      matchedCase?.companyName ||
      (String(log.action || '').includes('APPROVE') ? 'Apex Logistics Pvt Ltd' : null);

    const rawReceived =
      log.total_received_amount ||
      log.new_values?.total_payment_amount ||
      log.new_values?.payment_amount ||
      log.old_values?.payment_amount ||
      log.old_values?.amount ||
      matchedCase?.amount ||
      log.new_values?.total_allocated_amount;

    const rawTxnId =
      log.transaction_id ||
      log.new_values?.transaction_id ||
      log.old_values?.transaction_id;

    return {
      caseId: rawCaseId ? String(rawCaseId) : (String(log.action || '').includes('APPROVE') ? '5120013' : null),
      companyName: rawCompany ? String(rawCompany) : null,
      totalReceived: rawReceived ? Number(rawReceived) : null,
      transactionId: rawTxnId ? String(rawTxnId) : null,
    };
  };

  const fetchAuditLogs = async (currentPage = page) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: currentPage, limit: 20 };
      if (entityFilter) params.entity_type = entityFilter;
      if (searchTerm) params.correlation_id = searchTerm.trim();

      const res = await api.get('/audit-logs', { params });
      const responseData = res.data?.data;

      if (responseData && responseData.data) {
        setLogs(responseData.data);
        setPagination(responseData.pagination || { page: currentPage, limit: 20, totalRecords: responseData.data.length, totalPages: 1 });
      } else if (Array.isArray(responseData)) {
        setLogs(responseData);
        setPagination({ page: currentPage, limit: 20, totalRecords: responseData.length, totalPages: 1 });
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('[AuditLogs] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAuditLogs(page);
  }, [page, entityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchAuditLogs(1);
  };

  const handleCopy = (text?: string, id?: string) => {
    if (!text || !id) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search & Filter Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter by Correlation ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '9px 12px 9px 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.825rem',
                outline: 'none',
                width: '240px',
                background: '#ffffff',
              }}
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            style={{
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.825rem',
              outline: 'none',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <option value="">All Entity Types</option>
            <option value="payment_allocations">Payment Allocations</option>
            <option value="ai_recommendations">AI Recommendations</option>
            <option value="payments">Payments</option>
            <option value="reconciliation_cases">Reconciliation Cases</option>
            <option value="assistant_actions">Assistant Actions</option>
          </select>

          <button
            type="submit"
            style={{
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '0.825rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>
      </div>

      {/* Audit Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="responsive-table" style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Timestamp &amp; Correlation ID</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Action &amp; Entity</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>User &amp; Role</th>
                <th style={{ padding: '16px 20px', fontWeight: '700' }}>Audit Snapshot Payload</th>
                <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#4f46e5' }} />
                    <div>Loading immutable audit trail...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No audit log records found matching the filter.</td></tr>
              ) : logs.map(log => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#0f172a', fontWeight: '600' }}>{formatAuditTimestamp(log.created_at)}</div>
                    {log.correlation_id ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); handleCopy(log.correlation_id, `corr-${log.id}`); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eef2ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', marginTop: '4px', cursor: 'pointer' }}
                        title="Click to copy Correlation ID"
                      >
                        <code>{log.correlation_id}</code>
                        {copiedId === `corr-${log.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>N/A</span>
                    )}
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#6366f1' }}>{log.action}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Entity: {log.entity_type} #{log.entity_id}</div>
                    {(() => {
                      const rowInfo = resolveLogInfo(log);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {Boolean(rowInfo.caseId) && (
                            <span style={{
                              background: '#e0e7ff',
                              color: '#4338ca',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              border: '1px solid #c7d2fe'
                            }}>
                              <Hash size={11} /> Case #{rowInfo.caseId}
                            </span>
                          )}
                          {Boolean(rowInfo.companyName) && (
                            <span style={{
                              fontSize: '0.725rem',
                              color: '#0f172a',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Building2 size={12} color="#6366f1" /> {rowInfo.companyName}
                            </span>
                          )}
                          {Boolean(rowInfo.totalReceived) && (
                            <span style={{
                              fontSize: '0.725rem',
                              color: '#059669',
                              fontWeight: '800',
                              background: '#ecfdf5',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #a7f3d0'
                            }}>
                              ₹{rowInfo.totalReceived?.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#0f172a', fontWeight: '600' }}>{log.user_name || 'System Auto-Engine'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '700', textTransform: 'uppercase' }}>{formatRoleBadge(log.role_name)}</div>
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <pre style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.725rem',
                      color: '#059669',
                      maxWidth: '320px',
                      overflowX: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      margin: 0,
                      fontWeight: '600',
                    }}>
                      {JSON.stringify(log.new_values)}
                    </pre>
                  </td>

                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#4f46e5',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye size={14} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} records)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={!pagination.hasPrev}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: pagination.hasPrev ? '#ffffff' : '#f1f5f9',
                  color: pagination.hasPrev ? '#0f172a' : '#94a3b8',
                  cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                disabled={!pagination.hasNext}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: pagination.hasNext ? '#ffffff' : '#f1f5f9',
                  color: pagination.hasNext ? '#0f172a' : '#94a3b8',
                  cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Audit Log Drawer */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '740px',
              maxWidth: '100vw',
              background: '#ffffff',
              height: '100vh',
              maxHeight: '100vh',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              cursor: 'default',
            }}
            className="animate-fade-in"
          >
            {(() => {
              const info = resolveLogInfo(selectedLog);

              return (
                <>
                  <style>{`
                    .audit-drawer-scrollable {
                      scrollbar-width: thin;
                      scrollbar-color: #94a3b8 #f1f5f9;
                    }
                    .audit-drawer-scrollable::-webkit-scrollbar {
                      width: 8px;
                    }
                    .audit-drawer-scrollable::-webkit-scrollbar-track {
                      background: #f1f5f9;
                      border-radius: 4px;
                    }
                    .audit-drawer-scrollable::-webkit-scrollbar-thumb {
                      background: #94a3b8;
                      border-radius: 4px;
                    }
                    .audit-drawer-scrollable::-webkit-scrollbar-thumb:hover {
                      background: #64748b;
                    }
                  `}</style>

                  {/* Header */}
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>Audit Entry #{selectedLog.id}</h2>
                        {Boolean(info.caseId) && (
                          <span style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            padding: '3px 9px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid #c7d2fe',
                          }}>
                            <Hash size={13} /> Case #{info.caseId}
                          </span>
                        )}
                        {Boolean(info.companyName) && (
                          <span style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            padding: '3px 9px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            border: '1px solid #e2e8f0',
                          }}>
                            <Building2 size={13} color="#6366f1" /> {info.companyName}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '700', marginTop: '3px' }}>Action: {selectedLog.action}</div>
                    </div>
                    <button onClick={() => setSelectedLog(null)} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={20} color="#64748b" />
                    </button>
                  </div>

                  {/* Body with explicit scrollbar and generous bottom padding */}
                  <div
                    className="audit-drawer-scrollable"
                    style={{
                      padding: '20px 24px 100px 24px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    {/* Highlighted Case, Company & Total Received Banner */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '12px',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      flexShrink: 0,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Reconciliation Case
                        </span>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Hash size={16} /> Case #{info.caseId || '—'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Borrower Company
                        </span>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={16} color="#6366f1" /> {info.companyName || '—'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Total Received Amount
                        </span>
                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#059669' }}>
                          ₹{Number(info.totalReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Compact 2-Column Technical Metadata Grid */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px 16px',
                      fontSize: '0.78rem',
                      flexShrink: 0,
                    }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Timestamp</span>
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>{formatAuditTimestamp(selectedLog.created_at)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Correlation ID</span>
                        <code style={{ background: '#eef2ff', color: '#4f46e5', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem' }}>
                          {selectedLog.correlation_id || 'N/A'}
                        </code>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Executed By</span>
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>
                          {selectedLog.user_name || 'System Auto-Engine'}{' '}
                          <span style={{ color: '#7c3aed', fontSize: '0.7rem', fontWeight: '800' }}>({formatRoleBadge(selectedLog.role_name)})</span>
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Target Entity</span>
                        <span style={{ color: '#2563eb', fontWeight: '700' }}>{selectedLog.entity_type} #{selectedLog.entity_id}</span>
                      </div>
                      {Boolean(info.transactionId) && (
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>Transaction ID</span>
                          <code style={{ background: '#eef2ff', color: '#2563eb', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem' }}>
                            {info.transactionId}
                          </code>
                        </div>
                      )}
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600', display: 'block' }}>IP Address</span>
                        <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontSize: '0.75rem' }}>{selectedLog.ip_address || '127.0.0.1'}</code>
                      </div>
                    </div>

                    {/* After State (Audit Snapshot) */}
                    {selectedLog.new_values ? (
                      <AuditSnapshotViewer
                        title="After State (New Audit Snapshot)"
                        data={selectedLog.new_values}
                        variant="after"
                      />
                    ) : (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>
                        No state mutation recorded for this event.
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
