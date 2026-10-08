import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Award, ArrowLeft, CheckCircle2, XCircle, Clock,
  Download, AlertTriangle, RefreshCw, Users, Loader2,
  Calendar, BadgeCheck, Info, Sparkles, History, Eye
} from 'lucide-react'
import { getJob, getJobCertificates, downloadCertificate } from '../api'
import HistoryModal from '../components/HistoryModal'
import PdfViewerModal from '../components/PdfViewerModal'

// ── Constants ─────────────────────────────────────────────────────────────
const TERMINAL_STATUSES = new Set(['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'])
const POLL_INTERVAL = 2000

// ── Status helpers ────────────────────────────────────────────────────────
function statusMeta(status) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', pillClass: 'pill-success', icon: CheckCircle2 }
    case 'COMPLETED_WITH_ERRORS':
      return { label: 'Completed with Errors', pillClass: 'pill-warning', icon: AlertTriangle }
    case 'FAILED':
      return { label: 'Failed', pillClass: 'pill-error', icon: XCircle }
    case 'PROCESSING':
      return { label: 'Processing', pillClass: 'pill-processing', icon: RefreshCw }
    default:
      return { label: 'Pending', pillClass: 'pill-pending', icon: Clock }
  }
}

function certStatusMeta(status) {
  if (status === 'SUCCESS') return { label: 'Success', pillClass: 'pill-success', icon: CheckCircle2 }
  if (status === 'FAILED')  return { label: 'Failed',  pillClass: 'pill-error',   icon: XCircle }
  return { label: 'Pending', pillClass: 'pill-pending', icon: Clock }
}

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

// ── Download helper ───────────────────────────────────────────────────────
async function triggerDownload(certId, filename) {
  try {
    const res = await downloadCertificate(certId)
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'certificate.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Certificate downloaded!')
  } catch {
    toast.error('Failed to download certificate')
  }
}

// ── Icon wrapper ──────────────────────────────────────────────────────────
function IconBox({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 34, height: 34, borderRadius: 9,
      background: 'rgba(208,171,75,0.15)',
      border: '1px solid rgba(208,171,75,0.3)',
      color: 'var(--gold)', flexShrink: 0,
    }}>
      {children}
    </span>
  )
}

// ── Error Modal ───────────────────────────────────────────────────────────
function ErrorModal({ message, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="glass-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440, width: '100%', padding: 28, borderRadius: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--error-bg)',
            border: '1px solid rgba(239,83,80,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <XCircle size={18} color="var(--error)" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Certificate Error</h3>
        </div>
        <p style={{
          fontSize: 13, color: 'var(--text-muted)',
          background: 'rgba(14,18,37,0.6)', borderRadius: 10,
          padding: '14px 16px', fontFamily: 'monospace',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          border: '1px solid var(--navy-border)',
        }}>
          {message || 'An unknown error occurred.'}
        </p>
        <button
          onClick={onClose}
          className="btn-gold"
          style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accentColor, delay }) {
  return (
    <div
      className={`glass-card anim-fade-up${delay ? ` ${delay}` : ''}`}
      style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}
    >
      <div className="stat-card-accent" style={{ background: accentColor }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${accentColor}22`,
        border: `1px solid ${accentColor}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={accentColor} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          {label}
        </p>
        <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: 2 }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState(null)
  const [previewCert, setPreviewCert] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const isTerminal = job ? TERMINAL_STATUSES.has(job.status) : false

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, certsRes] = await Promise.all([getJob(jobId), getJobCertificates(jobId)])
      setJob(jobRes.data)
      setCerts(certsRes.data)
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Job not found')
        navigate('/')
      } else {
        toast.error('Failed to fetch job data')
      }
    } finally {
      setLoading(false)
    }
  }, [jobId, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (isTerminal) return
    const id = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [isTerminal, fetchData])

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(208,171,75,0.3)',
          }}>
            <Loader2 size={26} color="var(--navy)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 15 }}>Loading job data...</p>
        </div>
      </div>
    )
  }

  if (!job) return null

  const meta = statusMeta(job.status)
  const typeBadge = certTypeBadge(job.cert_type)
  const progress = job.total_recipients > 0
    ? Math.round(((job.successful_count + job.failed_count) / job.total_recipients) * 100)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {errorModal && <ErrorModal message={errorModal} onClose={() => setErrorModal(null)} />}

      {previewCert && (
        <PdfViewerModal
          cert={previewCert}
          onClose={() => setPreviewCert(null)}
        />
      )}

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onViewCert={(c) => setPreviewCert(c)}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid var(--navy-border)',
        background: 'linear-gradient(135deg, rgba(21,27,51,0.95) 0%, rgba(14,18,37,0.98) 100%)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), var(--gold-light), var(--gold), transparent)' }} />
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn-ghost" onClick={() => navigate('/')} style={{ padding: '7px 12px', fontSize: 12 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(208,171,75,0.3)',
          }}>
            <Award size={20} color="var(--navy)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {job.event_name}
              </h1>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: typeBadge.bg,
                  color: typeBadge.color,
                  border: `1px solid ${typeBadge.border}`,
                  textTransform: 'uppercase',
                }}
              >
                {typeBadge.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Calendar size={12} color="var(--text-dim)" />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{job.event_date}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              id="navbar-history-btn"
              className="btn-ghost"
              onClick={() => setShowHistory(true)}
              style={{ padding: '7px 12px', fontSize: 12 }}
            >
              <History size={14} color="var(--gold)" />
              <span>History</span>
            </button>
            <span
              className={meta.pillClass}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, flexShrink: 0 }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', opacity: 0.8 }} />
              {meta.label}
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <StatCard
            label="Total Recipients" value={job.total_recipients}
            icon={Users} accentColor="var(--gold)" delay="anim-delay-1"
          />
          <StatCard
            label="Successful" value={job.successful_count}
            icon={CheckCircle2} accentColor="var(--success)" delay="anim-delay-2"
          />
          <StatCard
            label="Failed" value={job.failed_count}
            icon={XCircle} accentColor={job.failed_count > 0 ? 'var(--error)' : 'var(--text-dim)'} delay="anim-delay-3"
          />
        </div>

        {/* ── Progress Bar ────────────────────────────────────────────────── */}
        {!isTerminal && (
          <section className="glass-card anim-fade-up" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Loader2 size={18} color="var(--gold)" style={{ animation: 'spin 1s linear infinite' }} />
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Generating Certificates...</h2>
              <span className="badge-gold" style={{ marginLeft: 'auto' }}>{progress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
              <span>{job.successful_count + job.failed_count} of {job.total_recipients} generated</span>
              <span style={{ color: 'var(--gold)' }}>{progress}%</span>
            </div>
          </section>
        )}

        {/* ── Certificate Results Table ────────────────────────────────────── */}
        <section className="glass-card anim-fade-up" style={{ overflow: 'hidden' }}>
          <div className="section-header">
            <IconBox><BadgeCheck size={16} /></IconBox>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Certificate Results</h2>
            <span className="badge-gold" style={{ marginLeft: 4 }}>{certs.length}</span>
          </div>

          {certs.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(208,171,75,0.08)', border: '1px solid rgba(208,171,75,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Users size={24} color="var(--text-dim)" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>No certificates yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>They will appear here once generation starts.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="lux-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Certificate ID</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((cert, idx) => {
                    const cm = certStatusMeta(cert.status)
                    const CIcon = cm.icon
                    return (
                      <tr key={cert.id}>
                        <td style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'monospace' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{cert.recipient_name}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{cert.recipient_email}</td>
                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-dim)' }}>
                          {cert.certificate_id || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td>
                          <span
                            className={cm.pillClass}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}
                          >
                            <CIcon size={12} />
                            {cm.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {cert.status === 'SUCCESS' ? (
                            <button
                              id={`download-cert-${cert.id}`}
                              className="btn-gold"
                              onClick={() => triggerDownload(cert.id, `${cert.certificate_id}_${cert.recipient_name}.pdf`)}
                              style={{ padding: '7px 14px', fontSize: 12, borderRadius: 9 }}
                              title="Download PDF"
                            >
                              <Download size={13} /> Download PDF
                            </button>
                          ) : cert.status === 'FAILED' ? (
                            <button
                              id={`error-cert-${cert.id}`}
                              onClick={() => setErrorModal(cert.error_message || 'Unknown error')}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '7px 14px', fontSize: 12, borderRadius: 9, cursor: 'pointer',
                                background: 'var(--error-bg)', color: 'var(--error)',
                                border: '1px solid rgba(239,83,80,0.25)', fontWeight: 600,
                              }}
                            >
                              <Info size={13} /> View Error
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Pending...</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── New Job button ───────────────────────────────────────────────── */}
        {isTerminal && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 40 }}>
            <button className="btn-gold" onClick={() => navigate('/')}>
              <Sparkles size={16} />
              Create Another Job
              <Award size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

