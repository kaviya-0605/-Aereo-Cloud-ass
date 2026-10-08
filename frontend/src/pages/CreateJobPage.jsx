import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Award, CalendarDays, Users, Plus, Trash2,
  Upload, FileText, Loader2, ChevronRight, Mail, User, Sparkles,
  History, Check, Calendar, ArrowRight, BookmarkCheck, FileBadge
} from 'lucide-react'
import { createJob } from '../api'
import HistoryModal from '../components/HistoryModal'
import PdfViewerModal from '../components/PdfViewerModal'

// ── Helpers ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { recipients: [], errors: ['CSV must have a header row and at least one data row'] }

  const header = lines[0].toLowerCase().split(',').map(s => s.trim())
  const nameIdx = header.indexOf('name')
  const emailIdx = header.indexOf('email')

  if (nameIdx === -1 || emailIdx === -1) {
    return { recipients: [], errors: ['CSV must have "name" and "email" columns'] }
  }

  const recipients = []
  const errors = []

  lines.slice(1).forEach((line, i) => {
    const cols = line.split(',').map(s => s.trim())
    const name = cols[nameIdx] || ''
    const email = cols[emailIdx] || ''
    if (!name) { errors.push(`Row ${i + 2}: missing name`); return }
    if (!email || !email.includes('@')) { errors.push(`Row ${i + 2}: invalid email "${email}"`); return }
    recipients.push({ name, email })
  })

  return { recipients, errors }
}

function newRecipient() { return { id: crypto.randomUUID(), name: '', email: '' } }

function formatDateReadable(isoStr) {
  if (!isoStr) return ''
  try {
    const parts = isoStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return isoStr
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
      color: 'var(--gold)',
      flexShrink: 0,
    }}>
      {children}
    </span>
  )
}

// ── Certificate Type Preview Text Map ──────────────────────────────────────
const CERT_TYPE_PREVIEWS = {
  'Achievement': {
    title: 'Certificate of Achievement',
    subheading: 'OF ACHIEVEMENT',
    sample: 'For outstanding performance and successful achievement in the event.',
    badgeColor: 'var(--gold)',
  },
  'Course Completion': {
    title: 'Certificate of Course Completion',
    subheading: 'OF COURSE COMPLETION',
    sample: 'For successfully completing all requirements and coursework for the event.',
    badgeColor: '#60a5fa',
  },
  'Participation': {
    title: 'Certificate of Participation',
    subheading: 'OF PARTICIPATION',
    sample: 'For active participation and valuable contribution to the event.',
    badgeColor: '#c084fc',
  },
}

// ── Component ─────────────────────────────────────────────────────────────
export default function CreateJobPage() {
  const navigate = useNavigate()
  const csvRef = useRef(null)

  const [eventName, setEventName] = useState('')
  const [certType, setCertType] = useState('Achievement')
  const [dateMode, setDateMode] = useState('single') // 'single' | 'range'
  const [singleDate, setSingleDate] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [recipients, setRecipients] = useState([newRecipient()])
  const [submitting, setSubmitting] = useState(false)
  const [csvDragging, setCsvDragging] = useState(false)

  // History & Viewer modal states
  const [showHistory, setShowHistory] = useState(false)
  const [selectedCertForPreview, setSelectedCertForPreview] = useState(null)

  const addRecipient = () => setRecipients(r => [...r, newRecipient()])
  const removeRecipient = (id) => setRecipients(r => r.length === 1 ? r : r.filter(x => x.id !== id))
  const updateRecipient = (id, field, value) =>
    setRecipients(r => r.map(x => x.id === id ? { ...x, [field]: value } : x))

  const handleCSVFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a .csv file'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const { recipients: parsed, errors } = parseCSV(e.target.result)
      if (errors.length) toast.error(errors.join('\n'), { duration: 6000 })
      if (parsed.length) {
        setRecipients(parsed.map(r => ({ ...r, id: crypto.randomUUID() })))
        toast.success(`Loaded ${parsed.length} recipient(s) from CSV`)
      }
    }
    reader.readAsText(file)
  }

  const onCSVChange = (e) => handleCSVFile(e.target.files[0])
  const onDrop = (e) => { e.preventDefault(); setCsvDragging(false); handleCSVFile(e.dataTransfer.files[0]) }

  // Compute final formatted date string
  const getFormattedEventDate = () => {
    if (dateMode === 'single') {
      return formatDateReadable(singleDate)
    }
    if (fromDate && toDate) {
      if (fromDate === toDate) return formatDateReadable(fromDate)
      return `${formatDateReadable(fromDate)} to ${formatDateReadable(toDate)}`
    }
    if (fromDate) return formatDateReadable(fromDate)
    return ''
  }

  const validate = () => {
    if (!eventName.trim()) { toast.error('Event name is required'); return false }
    
    if (dateMode === 'single') {
      if (!singleDate) { toast.error('Please select an event date'); return false }
    } else {
      if (!fromDate) { toast.error('Please select a "From Date"'); return false }
      if (!toDate) { toast.error('Please select a "To Date"'); return false }
      if (toDate < fromDate) { toast.error('"To Date" cannot be earlier than "From Date"'); return false }
    }

    for (const r of recipients) {
      if (!r.name.trim()) { toast.error('Recipient name cannot be empty'); return false }
      if (!r.email.trim() || !r.email.includes('@')) { toast.error(`Invalid email for "${r.name}"`); return false }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const finalEventDate = getFormattedEventDate()
      const payload = {
        event_name: eventName.trim(),
        event_date: finalEventDate,
        cert_type: certType,
        recipients: recipients.map(r => ({ name: r.name.trim(), email: r.email.trim() })),
      }
      const res = await createJob(payload)
      toast.success('Job created! Generating certificates...')
      navigate(`/results/${res.data.job_id}`)
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') toast.error(detail)
      else if (Array.isArray(detail)) toast.error(detail.map(d => d.msg).join('\n'))
      else toast.error('Failed to create job. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  const activeCertPreview = CERT_TYPE_PREVIEWS[certType] || CERT_TYPE_PREVIEWS['Achievement']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onViewCert={(cert) => {
          setSelectedCertForPreview(cert)
        }}
      />

      {selectedCertForPreview && (
        <PdfViewerModal
          cert={selectedCertForPreview}
          onClose={() => setSelectedCertForPreview(null)}
        />
      )}

      {/* ── Header / Navbar ──────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid var(--navy-border)',
        background: 'linear-gradient(135deg, rgba(21,27,51,0.95) 0%, rgba(14,18,37,0.98) 100%)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Gold top bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), var(--gold-light), var(--gold), transparent)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(208,171,75,0.35)',
          }}>
            <Award size={22} color="var(--navy)" />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Bulk Certificate Generator
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              Generate personalized luxury certificates for multiple recipients in seconds
            </p>
          </div>

          {/* Navbar Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              id="navbar-history-btn"
              className="btn-ghost"
              onClick={() => setShowHistory(true)}
              style={{ padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
              title="Access previously generated certificates"
            >
              <History size={16} color="var(--gold)" />
              <span style={{ fontWeight: 600 }}>History</span>
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* ── Event & Certificate Configuration ─────────────────────────── */}
        <section className="glass-card anim-fade-up" style={{ overflow: 'hidden' }}>
          <div className="section-header">
            <IconBox><CalendarDays size={16} /></IconBox>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Event &amp; Certificate Details</h2>
          </div>

          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top row: Event Name & Certification Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {/* Event Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Event / Course Name <span style={{ color: 'var(--gold)' }}>*</span>
                </label>
                <input
                  id="event-name"
                  type="text"
                  className="lux-input"
                  placeholder="e.g. Full Stack Web Development Bootcamp"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                />
              </div>

              {/* Certification Type Dropdown */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Certification Type <span style={{ color: 'var(--gold)' }}>*</span>
                  </label>
                  <span style={{ fontSize: 11, color: activeCertPreview.badgeColor, fontWeight: 600 }}>
                    {activeCertPreview.subheading}
                  </span>
                </div>
                <select
                  id="cert-type-select"
                  className="lux-input"
                  value={certType}
                  onChange={e => setCertType(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Achievement">Achievement (Certificate of Achievement)</option>
                  <option value="Course Completion">Course Completion (Certificate of Course Completion)</option>
                  <option value="Participation">Participation (Certificate of Participation)</option>
                </select>
              </div>
            </div>

            {/* Certificate Type Live Preview Indicator */}
            <div style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(14, 18, 37, 0.6)',
              border: '1px solid var(--navy-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <FileBadge size={18} color={activeCertPreview.badgeColor} />
              <div style={{ flex: 1, fontSize: 12 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  Certificate Format: {activeCertPreview.title}
                </span>
                <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                  — &quot;{activeCertPreview.sample}&quot;
                </span>
              </div>
            </div>

            {/* Event Date Section: Single Date or Date Range */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Event Date <span style={{ color: 'var(--gold)' }}>*</span>
                </label>

                {/* Date Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(14, 18, 37, 0.8)', padding: 3, borderRadius: 8, border: '1px solid var(--navy-border)' }}>
                  <button
                    type="button"
                    onClick={() => setDateMode('single')}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: dateMode === 'single' ? 'var(--gold)' : 'transparent',
                      color: dateMode === 'single' ? 'var(--navy)' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Single Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('range')}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: dateMode === 'range' ? 'var(--gold)' : 'transparent',
                      color: dateMode === 'range' ? 'var(--navy)' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Date Range (From – To)
                  </button>
                </div>
              </div>

              {/* Date Inputs based on mode */}
              {dateMode === 'single' ? (
                <div>
                  <input
                    id="event-date-single"
                    type="date"
                    className="lux-input"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                      From Date (Start)
                    </label>
                    <input
                      id="event-date-from"
                      type="date"
                      className="lux-input"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                    />
                  </div>
                  <div style={{ paddingTop: 18, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={16} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                      To Date (End)
                    </label>
                    <input
                      id="event-date-to"
                      type="date"
                      className="lux-input"
                      min={fromDate}
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Formatted Date Preview */}
              {getFormattedEventDate() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--gold-light)' }}>
                  <BookmarkCheck size={14} />
                  <span>Will appear on certificate as: <strong>{getFormattedEventDate()}</strong></span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CSV Upload ────────────────────────────────────────────────── */}
        <section className="glass-card anim-fade-up anim-delay-1" style={{ overflow: 'hidden' }}>
          <div className="section-header">
            <IconBox><Upload size={16} /></IconBox>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Upload CSV</h2>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>Optional · populates the table below</span>
          </div>
          <div style={{ padding: '16px 24px' }}>
            <div
              className={`drop-zone${csvDragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setCsvDragging(true) }}
              onDragLeave={() => setCsvDragging(false)}
              onDrop={onDrop}
              onClick={() => csvRef.current?.click()}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(208,171,75,0.12)', border: '1px solid rgba(208,171,75,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <FileText size={22} color="var(--gold)" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                Drop your CSV file here, or <span style={{ color: 'var(--gold)', textDecoration: 'underline' }}>browse</span>
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Required columns: <code style={{ background: 'rgba(208,171,75,0.1)', color: 'var(--gold-light)', padding: '1px 6px', borderRadius: 4 }}>name</code>
                {' '}&amp;{' '}
                <code style={{ background: 'rgba(208,171,75,0.1)', color: 'var(--gold-light)', padding: '1px 6px', borderRadius: 4 }}>email</code>
              </p>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onCSVChange} />
            </div>
          </div>
        </section>

        {/* ── Recipients Table ──────────────────────────────────────────── */}
        <section className="glass-card anim-fade-up anim-delay-2" style={{ overflow: 'hidden' }}>
          <div className="section-header">
            <IconBox><Users size={16} /></IconBox>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Recipients</h2>
            <span className="badge-gold" style={{ marginLeft: 4 }}>{recipients.length}</span>
            <button
              id="add-recipient-btn"
              className="btn-ghost"
              onClick={addRecipient}
              style={{ marginLeft: 'auto' }}
            >
              <Plus size={14} /> Add Recipient
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="lux-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={12} /> Name
                    </span>
                  </th>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Mail size={12} /> Email
                    </span>
                  </th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'monospace' }}>{idx + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="lux-input"
                        placeholder="Recipient Name"
                        value={r.name}
                        onChange={e => updateRecipient(r.id, 'name', e.target.value)}
                        style={{ padding: '8px 12px', fontSize: 13 }}
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        className="lux-input"
                        placeholder="email@example.com"
                        value={r.email}
                        onChange={e => updateRecipient(r.id, 'email', e.target.value)}
                        style={{ padding: '8px 12px', fontSize: 13 }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn-danger-ghost"
                        onClick={() => removeRecipient(r.id)}
                        disabled={recipients.length === 1}
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--navy-border)' }}>
            <button className="btn-ghost" onClick={addRecipient} style={{ fontSize: 12 }}>
              <Plus size={13} /> Add another recipient
            </button>
          </div>
        </section>

        {/* ── Generate Button ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 40 }}>
          <button
            id="generate-certificates-btn"
            className="btn-gold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Generating Certificates...
              </>
            ) : (
              <>
                <Award size={16} />
                Generate Certificates
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}


