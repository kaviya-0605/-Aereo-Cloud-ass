import { useState, useEffect } from 'react'
import { X, Download, ExternalLink, Loader2, Award, AlertCircle } from 'lucide-react'
import { downloadCertificate } from '../api'
import toast from 'react-hot-toast'

export default function PdfViewerModal({ cert, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const displayName = cert?.recipient_name || 'Certificate'
  const certCode = cert?.certificate_id || 'CERT'

  useEffect(() => {
    let active = true
    let urlToRevoke = null

    async function loadPdf() {
      if (!cert?.id) return
      setLoading(true)
      setError(null)
      try {
        const res = await downloadCertificate(cert.id)
        if (!active) return
        const blob = new Blob([res.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        urlToRevoke = url
        setBlobUrl(url)
      } catch (err) {
        if (!active) return
        console.error('Error loading certificate PDF:', err)
        setError('Could not load certificate PDF. The file may be generating or not found on disk.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPdf()

    return () => {
      active = false
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke)
      }
    }
  }, [cert?.id])

  if (!cert) return null

  const handleDownload = () => {
    if (!blobUrl) {
      toast.error('PDF is not ready yet')
      return
    }
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${certCode}_${displayName.replace(/\s+/g, '_')}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success('Certificate downloaded!')
  }

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank')
    } else {
      window.open(`/api/certificates/${cert.id}/view`, '_blank')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
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
          height: '90vh',
          maxHeight: '850px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px var(--navy-border)',
          background: 'var(--navy-mid)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--navy-border)',
            background: 'linear-gradient(135deg, rgba(21,27,51,0.98) 0%, rgba(14,18,37,0.98) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 12px rgba(208,171,75,0.3)',
                flexShrink: 0,
              }}
            >
              <Award size={18} color="var(--navy)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3
                  className="font-display"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </h3>
                <span className="badge-gold" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                  {certCode}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {cert.recipient_email || 'Verified Certificate PDF'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={handleOpenNewTab}
              className="btn-ghost"
              style={{ padding: '7px 12px', fontSize: 12 }}
              title="Open in new browser tab"
            >
              <ExternalLink size={13} />
              <span>Open in Tab</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !blobUrl}
              className="btn-gold"
              style={{ padding: '7px 15px', fontSize: 12, borderRadius: 9 }}
              title="Download PDF"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="btn-danger-ghost"
              style={{ padding: 8, color: 'var(--text-muted)', marginLeft: 4 }}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PDF viewer body */}
        <div style={{ flex: 1, position: 'relative', background: '#0a0d1a', display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                zIndex: 2,
                background: '#0a0d1a',
              }}
            >
              <Loader2 size={32} color="var(--gold)" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fetching Certificate PDF from database...</p>
            </div>
          )}

          {error ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                textAlign: 'center',
                gap: 12,
              }}
            >
              <AlertCircle size={40} color="var(--error)" />
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Unable to Preview Certificate</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440 }}>{error}</p>
              <button
                onClick={handleOpenNewTab}
                className="btn-gold"
                style={{ marginTop: 8 }}
              >
                <ExternalLink size={14} /> Open Directly in Browser Tab
              </button>
            </div>
          ) : blobUrl ? (
            <object
              data={`${blobUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ flex: 1, border: 'none', background: '#ffffff', display: 'block' }}
            >
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0`}
                title={`Certificate - ${displayName}`}
                width="100%"
                height="100%"
                style={{ border: 'none', background: '#ffffff' }}
              >
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-primary)' }}>
                  <p>Your browser does not support inline PDF viewing.</p>
                  <button onClick={handleDownload} className="btn-gold" style={{ marginTop: 12 }}>
                    Download PDF
                  </button>
                </div>
              </iframe>
            </object>
          ) : null}
        </div>
      </div>
    </div>
  )
}
