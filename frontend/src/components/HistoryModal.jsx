import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  History, X, Award, Calendar, Users, Eye, Download,
  RefreshCw, Search, CheckCircle2, AlertTriangle, XCircle,
  Clock, ExternalLink, Loader2, FileText, Layers, FileBadge
} from 'lucide-react'
import { getHistoryCertificates, downloadCertificate } from '../api'
import toast from 'react-hot-toast'

function certTypeBadge(type) {
  const t = (type || 'Achievement').toLowerCase()
  if (t.includes('completion') || t.includes('course')) {
    return { label: 'Course Completion', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' }
  }
  if (t.includes('participation')) {
    return { label: 'Participation', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }
  }
  return { label: 'Achievement', bg: 'rgba(208, 171, 75, 0.15)', color: 'var(--gold-light)', border: 'rgba(208, 171, 75, 0.3)' }
}

export default function HistoryModal({ isOpen, onClose, onViewCert }) {
  const navigate = useNavigate()
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')
  const [viewMode, setViewMode] = useState('all') // 'all' | 'grouped'

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await getHistoryCertificates()
      setCerts(res.data || [])
    } catch {
      toast.error('Failed to load certificates from database')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, fetchHistory])

  const handleDownload = async (cert, e) => {
    if (e) e.stopPropagation()
    try {
      const res = await downloadCertificate(cert.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${cert.certificate_id || 'CERT'}_${(cert.recipient_name || 'certificate').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded certificate for ${cert.recipient_name}`)
    } catch {
      toast.error('Failed to download certificate')
    }
  }

  if (!isOpen) return null

  // Filter certificates
  const filteredCerts = certs.filter(c => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      c.recipient_name.toLowerCase().includes(q) ||
      c.recipient_email.toLowerCase().includes(q) ||
      c.event_name.toLowerCase().includes(q) ||
      (c.certificate_id && c.certificate_id.toLowerCase().includes(q)) ||
      (c.event_date && c.event_date.toLowerCase().includes(q))

    const matchesType =
      selectedType === 'ALL' ||
      (c.cert_type && c.cert_type.toLowerCase() === selectedType.toLowerCase())

    return matchesSearch && matchesType
  })

  // Group by job/event if in grouped mode
  const groupedByJob = filteredCerts.reduce((acc, cert) => {
    const key = cert.job_id || cert.event_name
    if (!acc[key]) {
      acc[key] = {
        job_id: cert.job_id,
        event_name: cert.event_name,
        event_date: cert.event_date,
        cert_type: cert.cert_type,
        created_at: cert.created_at,
        certs: [],
      }
    }
    acc[key].certs.push(cert)
    return acc
  }, {})

  const jobGroups = Object.values(groupedByJob)
  const successfulCount = certs.filter(c => c.status === 'SUCCESS').length

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="glass-card anim-fade-up"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '88vh',
          maxHeight: '820px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          overflow: 'hidden',
          background: 'var(--navy-mid)',
          border: '1px solid var(--navy-border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--navy-border)',
            background: 'linear-gradient(135deg, rgba(21,27,51,0.98) 0%, rgba(14,18,37,0.98) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(208,171,75,0.3)',
              }}
            >
              <History size={22} color="var(--navy)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Generated Certificates History
                </h2>
                <span className="badge-gold" style={{ fontSize: 11 }}>
                  {certs.length} {certs.length === 1 ? 'certificate' : 'certificates'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Browse, preview, and download previously generated certificates stored in the database
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => fetchHistory(true)}
              disabled={refreshing || loading}
              className="btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
              title="Refresh database records"
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="btn-danger-ghost"
              style={{ padding: 8, color: 'var(--text-muted)' }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter and stats toolbar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(14, 18, 37, 0.75)',
            borderBottom: '1px solid var(--navy-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Quick stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total: <strong style={{ color: 'var(--gold-light)' }}>{certs.length}</strong>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Ready PDFs: <strong style={{ color: 'var(--success)' }}>{successfulCount}</strong>
            </span>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 380, marginLeft: 'auto' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="lux-input"
              placeholder="Search recipient, event, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '6px 12px 6px 32px', fontSize: 12, height: 34 }}
            />
          </div>

          {/* Cert Type dropdown filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="lux-input"
            style={{ width: 'auto', padding: '5px 12px', fontSize: 12, height: 34, cursor: 'pointer' }}
          >
            <option value="ALL">All Certification Types</option>
            <option value="Achievement">Achievement</option>
            <option value="Course Completion">Course Completion</option>
            <option value="Participation">Participation</option>
          </select>

          {/* View Mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(10, 14, 30, 0.8)', padding: 2, borderRadius: 8, border: '1px solid var(--navy-border)' }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'all' ? 'var(--gold)' : 'transparent',
                color: viewMode === 'all' ? 'var(--navy)' : 'var(--text-muted)',
              }}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grouped' ? 'var(--gold)' : 'transparent',
                color: viewMode === 'grouped' ? 'var(--navy)' : 'var(--text-muted)',
              }}
            >
              By Event
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 260, gap: 12 }}>
              <Loader2 size={32} color="var(--gold)" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fetching generated certificates from database...</p>
            </div>
          ) : filteredCerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'rgba(208,171,75,0.08)',
                  border: '1px solid rgba(208,171,75,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <History size={26} color="var(--text-dim)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No Certificates Found</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, maxWidth: 380, margin: '6px auto 0' }}>
                {searchQuery || selectedType !== 'ALL'
                  ? 'No certificates match your search or filter. Try clearing filters.'
                  : 'You have not generated any certificates yet. Fill out the form to generate your first batch!'}
              </p>
              {(searchQuery || selectedType !== 'ALL') && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedType('ALL') }}
                  className="btn-ghost"
                  style={{ marginTop: 14, fontSize: 12 }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === 'all' ? (
            /* Table of All Certificates */
            <div style={{ overflowX: 'auto', background: 'rgba(14, 18, 37, 0.6)', borderRadius: 12, border: '1px solid var(--navy-border)' }}>
              <table className="lux-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Recipient</th>
                    <th>Event &amp; Type</th>
                    <th>Certificate ID</th>
                    <th>Event Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCerts.map((c, idx) => {
                    const isSuccess = c.status === 'SUCCESS'
                    const tb = certTypeBadge(c.cert_type)
                    return (
                      <tr key={c.id} style={{ cursor: isSuccess ? 'pointer' : 'default' }} onClick={() => isSuccess && onViewCert(c)}>
                        <td style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 11 }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.recipient_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.recipient_email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.event_name}</div>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: tb.bg,
                              color: tb.color,
                              border: `1px solid ${tb.border}`,
                              textTransform: 'uppercase',
                              marginTop: 2,
                            }}
                          >
                            {tb.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--gold-light)' }}>
                            {c.certificate_id || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {c.event_date}
                        </td>
                        <td>
                          <span
                            className={isSuccess ? 'pill-success' : 'pill-error'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}
                          >
                            {isSuccess ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {c.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          {isSuccess && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <button
                                id={`history-view-${c.id}`}
                                onClick={() => onViewCert(c)}
                                className="btn-gold"
                                style={{ padding: '6px 12px', fontSize: 11, borderRadius: 8 }}
                                title="Open PDF Preview"
                              >
                                <Eye size={12} />
                                <span>View PDF</span>
                              </button>
                              <button
                                id={`history-dl-${c.id}`}
                                onClick={(e) => handleDownload(c, e)}
                                className="btn-ghost"
                                style={{ padding: '6px 10px', fontSize: 11, borderRadius: 8 }}
                                title="Download PDF directly"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grouped by Event / Job */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {jobGroups.map(group => {
                const tb = certTypeBadge(group.cert_type)
                return (
                  <div
                    key={group.job_id || group.event_name}
                    style={{
                      background: 'rgba(14, 18, 37, 0.7)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Event Header */}
                    <div
                      style={{
                        padding: '14px 20px',
                        background: 'rgba(21, 27, 51, 0.9)',
                        borderBottom: '1px solid var(--navy-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Award size={18} color="var(--gold)" />
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {group.event_name}
                        </h4>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: tb.bg,
                            color: tb.color,
                            border: `1px solid ${tb.border}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {tb.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} /> {group.event_date}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} /> {group.certs.length} recipient(s)
                        </span>
                        {group.job_id && (
                          <button
                            onClick={() => {
                              onClose()
                              navigate(`/results/${group.job_id}`)
                            }}
                            className="btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            title="Go to job page"
                          >
                            <ExternalLink size={11} /> Open Job
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Certs under this event */}
                    <div style={{ padding: '8px 16px' }}>
                      <table className="lux-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Recipient</th>
                            <th>Email</th>
                            <th>Certificate ID</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.certs.map(c => {
                            const isSuccess = c.status === 'SUCCESS'
                            return (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.recipient_name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{c.recipient_email}</td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--gold-light)' }}>{c.certificate_id || '—'}</td>
                                <td>
                                  <span
                                    className={isSuccess ? 'pill-success' : 'pill-error'}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}
                                  >
                                    {isSuccess ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                    {c.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {isSuccess && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <button
                                        onClick={() => onViewCert(c)}
                                        className="btn-gold"
                                        style={{ padding: '5px 11px', fontSize: 11, borderRadius: 7 }}
                                      >
                                        <Eye size={12} /> View PDF
                                      </button>
                                      <button
                                        onClick={(e) => handleDownload(c, e)}
                                        className="btn-ghost"
                                        style={{ padding: '5px 9px', fontSize: 11, borderRadius: 7 }}
                                      >
                                        <Download size={12} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
