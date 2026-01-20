import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { t } from '../utils/i18n'
import { Button } from '../components/ui/button'
import { Download } from 'lucide-react'

export default function PublicView() {
  const { shareId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    fetch(`${apiBase}/api/public/resume/${shareId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [shareId])

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold mb-2">Resume Not Found</h1>
      <p className="text-muted-foreground mb-4">The link might be expired or invalid.</p>
      <Link to="/"><Button>Go Home</Button></Link>
    </div>
  )

  if (!data) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  const personal = (data.sections || []).find(s => s.type === 'personal')?.data || {}
  const summary = (data.sections || []).find(s => s.type === 'summary')?.data?.text || ''
  const exp = (data.sections || []).find(s => s.type === 'experience')?.data || { items: [] }
  const edu = (data.sections || []).find(s => s.type === 'education')?.data || { items: [] }
  const skills = (data.sections || []).find(s => s.type === 'skills')?.data || { items: [] }
  const projects = (data.sections || []).find(s => s.type === 'projects')?.data || { items: [] }
  const lang = data.language || 'en'

  const handleDownload = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 overflow-auto flex flex-col items-center py-8">
      {/* Top Bar for CTA */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg hidden sm:block">AI Resume</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Save PDF
          </Button>
          <Link to="/auth/register">
            <Button>Build Your Own</Button>
          </Link>
        </div>
      </div>

      <div className={`resume-paper tpl-${data.template || 'modern'} shadow-2xl mb-8`}>
        <h1 className="text-3xl font-bold mb-1">{personal.name || 'Your Name'}</h1>
        <p className="text-sm text-gray-600 mb-4">{personal.email} {personal.phone ? '• ' + personal.phone : ''}</p>

        {summary && (
          <>
            <h2 className="resume-section-title">{t(lang, 'summary')}</h2>
            <p className="whitespace-pre-wrap mb-4">{summary}</p>
          </>
        )}

        {(exp.items || []).length > 0 && <h2 className="resume-section-title">{t(lang, 'experience')}</h2>}
        <div className="space-y-2 mb-4">
          {(exp.items || []).map((it, idx) => (
            <div key={idx}>
              <p className="font-medium">{it.role} — {it.company}</p>
              <p className="text-xs text-gray-600">{it.start} - {it.end}</p>
              <p className="whitespace-pre-wrap">{it.desc}</p>
            </div>
          ))}
        </div>

        {(edu.items || []).length > 0 && <>
          <h2 className="resume-section-title">{t(lang, 'education')}</h2>
          <div className="space-y-2 mb-4">
            {(edu.items || []).map((it, idx) => (
              <div key={idx}>
                <p className="font-medium">{it.degree} — {it.school}</p>
                <p className="text-xs text-gray-600">{it.year}</p>
                <p className="whitespace-pre-wrap">{it.details}</p>
              </div>
            ))}
          </div>
        </>}

        {(skills.items || []).length > 0 && <>
          <h2 className="resume-section-title">{t(lang, 'skills')}</h2>
          <p className="mb-4">{(skills.items || []).join(' • ')}</p>
        </>}

        {(projects.items || []).length > 0 && <>
          <h2 className="resume-section-title">Projects</h2>
          <div className="space-y-1 mb-4">
            {(projects.items || []).map((p, idx) => (
              <p key={idx} className="text-sm"><span className="font-medium">{p.name}</span>{p.link ? ` — ${p.link}` : ''}{p.desc ? ` — ${p.desc}` : ''}</p>
            ))}
          </div>
        </>}
      </div>

      <p className="text-muted-foreground text-sm">Powered by AI Resume Builder</p>
    </div>
  )
}
