import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { t } from '../utils/i18n'

import { Slate, Editable, withReact } from 'slate-react'
import { createEditor } from 'slate'
import { withHistory } from 'slate-history'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { ArrowLeft, Save, Download, History, Wand2, GripVertical, Trash2, Plus, FileStack } from 'lucide-react'

export default function ResumeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resume, setResume] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const saveTimer = useRef(null)
  const [activeTab, setActiveTab] = useState('personal')

  // AI State
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiJobTitle, setAiJobTitle] = useState('')
  const [aiLevel, setAiLevel] = useState('mid')
  const [aiIndustry, setAiIndustry] = useState('General')
  const [aiLoading, setAiLoading] = useState(false)


  const [restoring, setRestoring] = useState(false)

  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  const [summaryValue, setSummaryValue] = useState([{ type: 'paragraph', children: [{ text: '' }] }])

  const load = async () => {
    try {
      const { data } = await api.get(`/api/resume/${id}`)
      setResume(data)
    } catch {
      // navigate('/dashboard')
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!resume) return
    const sec = (resume.sections || []).find(s => s.type === 'summary')
    const text = (sec?.data?.text || '').toString()
    setSummaryValue([{ type: 'paragraph', children: [{ text }] }])
  }, [resume])

  const queueSave = (next) => {
    setResume(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await api.put(`/api/resume/${id}`, next)
      setSaving(false)
    }, 600)
  }

  const updateField = (sectionType, path, value) => {
    const next = { ...resume }
    if (!next.sections) next.sections = []
    let section = next.sections.find((s) => s.type === sectionType)
    if (!section) {
      next.sections.push({ type: sectionType, data: {} })
      section = next.sections.find((s) => s.type === sectionType)
    }
    section.data[path] = value
    queueSave(next)
  }

  const generateSummary = async () => {
    setAiLoading(true)
    try {
      const body = {
        jobTitle: aiJobTitle || resume?.title || 'Professional',
        experienceLevel: aiLevel || 'mid',
        industry: aiIndustry || 'General',
        bullets: (sectionData('experience')?.items || [])
          .map((it) => (it.desc || '').trim())
          .filter(Boolean)
          .slice(0, 5)
      }
      const { data } = await api.post('/api/ai/generate-summary', body)
      const next = { ...resume }
      const existing = next.sections.find((s) => s.type === 'summary')
      if (existing) existing.data.text = data.summary
      else next.sections.push({ type: 'summary', data: { text: data.summary } })

      setSummaryValue([{ type: 'paragraph', children: [{ text: data.summary }] }])
      queueSave(next)
      setShowAiModal(false)
    } finally {
      setAiLoading(false)
    }
  }

  const sectionData = (type) => resume?.sections?.find((s) => s.type === type)?.data
  const slateToPlain = (nodes) => nodes.map(n => (n.children ? slateToPlain(n.children) : (n.text || ''))).join('\n')

  const sectionOrder = useMemo(() => {
    if (!resume) return []
    const existing = Array.isArray(resume.order) ? resume.order : []
    const sectionTypes = (resume.sections || []).map(s => s.type)
    const merged = [...existing.filter(t => sectionTypes.includes(t))]
    for (const t of sectionTypes) if (!merged.includes(t)) merged.push(t)
    return merged
  }, [resume])

  const upsertSection = (type, data) => {
    const next = { ...resume }
    const existing = next.sections.find((s) => s.type === type)
    if (existing) existing.data = data
    else next.sections.push({ type, data })
    queueSave(next)
  }

  const appendItem = (type, item) => {
    const data = sectionData(type) || { items: [] }
    const items = Array.isArray(data.items) ? [...data.items, item] : [item]
    upsertSection(type, { ...data, items })
  }

  const updateItem = (type, idx, patch) => {
    const data = sectionData(type) || { items: [] }
    const items = [...(data.items || [])]
    items[idx] = { ...items[idx], ...patch }
    upsertSection(type, { ...data, items })
  }

  const removeItem = (type, idx) => {
    const data = sectionData(type) || { items: [] }
    const items = (data.items || []).filter((_, i) => i !== idx)
    upsertSection(type, { ...data, items })
  }

  const recordDownload = async () => {
    await api.post(`/api/resume/${id}/download`, { type: 'pdf' })
    window.print()
  }



  const snapshotVersion = async () => {
    const { data } = await api.post(`/api/resume/${id}/version`)
    setResume({ ...resume, versions: data.versions })
  }

  const restoreVersion = async (versionId) => {
    setRestoring(true)
    try {
      const { data } = await api.post(`/api/resume/${id}/restore`, { versionId })
      setResume(data)
    } finally {
      setRestoring(false)
    }
  }

  if (!resume) return <div className="flex items-center justify-center h-screen">Loading Editor...</div>

  const personal = sectionData('personal') || {}
  const summary = sectionData('summary')?.text || ''
  const exp = sectionData('experience') || { items: [] }
  const edu = sectionData('education') || { items: [] }
  const skills = sectionData('skills') || { items: [] }
  const projects = sectionData('projects') || { items: [] }
  const certs = sectionData('certs') || { items: [] }
  const lang = resume.language || 'en'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <style>{`
        @media print {
          .app-header, .editor-sidebar, .no-print { display: none !important; }
          .editor-main { padding: 0 !important; overflow: visible !important; background: white !important; }
          @page { margin: 0; }
          body, html { background: white !important; height: auto !important; overflow: visible !important; }
          .resume-paper { shadow: none !important; margin: 0 !important; width: 100% !important; }
        }
      `}</style>

      {/* Header */}
      <header className="app-header print:hidden flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6 relative z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold">{resume.title}</h1>
            <span className="text-xs text-muted-foreground">{saving ? 'Saving...' : 'All changes saved'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={resume.template} onValueChange={(val) => queueSave({ ...resume, template: val })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resume.language || 'en'} onValueChange={(val) => queueSave({ ...resume, language: val })}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={async () => {
            await snapshotVersion()
            alert('Version saved!')
          }}>
            <History className="mr-2 h-4 w-4" />
            Save Version
          </Button>
          <Button size="sm" onClick={recordDownload}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar / Editor */}
        <aside className="editor-sidebar print:hidden w-full max-w-md overflow-y-auto border-r bg-slate-50/50 p-8 pb-32 lg:block hidden custom-scrollbar shadow-inner">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 grid-rows-2 h-auto gap-1 mb-4 p-1">
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
              <TabsTrigger value="experience" className="text-xs">Experience</TabsTrigger>
              <TabsTrigger value="education" className="text-xs">Education</TabsTrigger>
              <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
              <TabsTrigger value="certs" className="text-xs">Certs</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-8 pt-6">
              <div className="space-y-6">
                {/* Image upload removed as per user request */}

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input placeholder="e.g. John Doe" value={personal.name || ''} onChange={(e) => updateField('personal', 'name', e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input placeholder="e.g. john@example.com" value={personal.email || ''} onChange={(e) => updateField('personal', 'email', e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input placeholder="e.g. +1 234 567 890" value={personal.phone || ''} onChange={(e) => updateField('personal', 'phone', e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input placeholder="e.g. New York, USA" value={personal.location || ''} onChange={(e) => updateField('personal', 'location', e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Website / LinkedIn</label>
                  <Input placeholder="URL" value={personal.url || ''} onChange={(e) => updateField('personal', 'url', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Professional Summary</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAiModal(true)} className="h-6 gap-1 text-primary">
                    <Wand2 className="h-3 w-3" /> AI Write
                  </Button>
                </div>
                <div className="min-h-[150px] p-2 border rounded-md bg-background cursor-text" onClick={() => {
                  // Focus logic if needed
                }}>
                  <Slate editor={editor} initialValue={summaryValue} onChange={(val) => {
                    const isAstChange = editor.operations.some(op => 'set_selection' !== op.type)
                    if (isAstChange) {
                      const text = slateToPlain(val)
                      // local update to avoid stutter
                      // setSummaryValue(val) - avoid setting state on every keystroke if it causes re-render issues with Slate
                      // Instead, queue the save or just update ref
                      const next = { ...resume }
                      let existing = next.sections.find((s) => s.type === 'summary')
                      if (!existing) { next.sections.push({ type: 'summary', data: {} }); existing = next.sections.find(s => s.type === 'summary'); }
                      existing.data.text = text
                      queueSave(next)
                    }
                  }}>
                    <Editable
                      className="outline-none min-h-[140px] px-2 py-1"
                      placeholder="Write your professional summary here..."
                    />
                  </Slate>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="experience" className="space-y-6">
              <Button className="w-full" variant="outline" onClick={() => appendItem('experience', { role: '', company: '', start: '', end: '', desc: '' })}>
                <Plus className="mr-2 h-4 w-4" /> Add Position
              </Button>
              {exp.items?.map((it, idx) => (
                <Card key={idx} className="mb-4">
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                    <div className="font-medium text-sm">{it.role || 'New Role'}</div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem('experience', idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <Input placeholder="Role" value={it.role || ''} onChange={(e) => updateItem('experience', idx, { role: e.target.value })} />
                    <Input placeholder="Company" value={it.company || ''} onChange={(e) => updateItem('experience', idx, { company: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="month" placeholder="Start Date" value={it.start || ''} onChange={(e) => updateItem('experience', idx, { start: e.target.value })} />
                      <Input type="month" placeholder="End Date" value={it.end || ''} onChange={(e) => updateItem('experience', idx, { end: e.target.value })} />
                    </div>
                    <Textarea placeholder="Description" value={it.desc || ''} onChange={(e) => updateItem('experience', idx, { desc: e.target.value })} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="education" className="space-y-6">
              <Button className="w-full" variant="outline" onClick={() => appendItem('education', { degree: '', school: '', year: '', details: '' })}>
                <Plus className="mr-2 h-4 w-4" /> Add Education
              </Button>
              {edu.items?.map((it, idx) => (
                <Card key={idx}>
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                    <div className="font-medium text-sm">{it.school || 'New School'}</div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem('education', idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <Input placeholder="Degree" value={it.degree || ''} onChange={(e) => updateItem('education', idx, { degree: e.target.value })} />
                    <Input placeholder="School" value={it.school || ''} onChange={(e) => updateItem('education', idx, { school: e.target.value })} />
                    <Input placeholder="Year" value={it.year || ''} onChange={(e) => updateItem('education', idx, { year: e.target.value })} />
                    <Textarea placeholder="Details" value={it.details || ''} onChange={(e) => updateItem('education', idx, { details: e.target.value })} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <div className="flex gap-2">
                <Input id="skillInput" placeholder="Add a skill" />
                <Button onClick={() => {
                  const el = document.getElementById('skillInput')
                  const val = (el.value || '').trim()
                  if (!val) return
                  const list = Array.isArray(skills.items) ? skills.items : []
                  upsertSection('skills', { items: [...list, val] })
                  el.value = ''
                }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.items?.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm bg-accent">
                    {s}
                    <button onClick={() => removeItem('skills', idx)} className="text-muted-foreground hover:text-foreground">✕</button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
              <Button className="w-full" variant="outline" onClick={() => appendItem('projects', { name: '', link: '', desc: '' })}>
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Button>
              {projects.items?.map((it, idx) => (
                <Card key={idx}>
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                    <div className="font-medium text-sm">{it.name || 'New Project'}</div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem('projects', idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <Input placeholder="Project Name" value={it.name || ''} onChange={(e) => updateItem('projects', idx, { name: e.target.value })} />
                    <Input placeholder="Link" value={it.link || ''} onChange={(e) => updateItem('projects', idx, { link: e.target.value })} />
                    <Textarea placeholder="Description" value={it.desc || ''} onChange={(e) => updateItem('projects', idx, { desc: e.target.value })} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="certs" className="space-y-6">
              <Button className="w-full" variant="outline" onClick={() => appendItem('certs', { name: '', org: '', year: '' })}>
                <Plus className="mr-2 h-4 w-4" /> Add Certification
              </Button>
              {certs.items?.map((it, idx) => (
                <Card key={idx}>
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                    <div className="font-medium text-sm">{it.name || 'Certification'}</div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem('certs', idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <Input placeholder="Name" value={it.name || ''} onChange={(e) => updateItem('certs', idx, { name: e.target.value })} />
                    <Input placeholder="Organization" value={it.org || ''} onChange={(e) => updateItem('certs', idx, { org: e.target.value })} />
                    <Input placeholder="Year" value={it.year || ''} onChange={(e) => updateItem('certs', idx, { year: e.target.value })} />
                    <Input placeholder="Image URL (Badge)" value={it.imageUrl || ''} onChange={(e) => updateItem('certs', idx, { imageUrl: e.target.value })} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>


          </Tabs>
        </aside>

        {/* Preview Area */}
        <main className="editor-main flex-1 overflow-auto bg-neutral-100 p-8 dark:bg-neutral-900 flex justify-center">
          <div className={`resume-paper tpl-${resume.template} origin-top transition-transform scale-90 lg:scale-100 shadow-2xl`}>
            {/* Modern Template */}
            <div className="h-full">
              <header className="resume-header flex items-start gap-6">
                <div className="flex-1 pt-1">
                  <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2 uppercase leading-none">{personal.name || 'YOUR NAME'}</h1>
                  <div className="flex flex-wrap gap-y-1 gap-x-3 text-sm font-medium text-slate-600">
                    {personal.email && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">@</span>
                        <span>{personal.email}</span>
                      </div>
                    )}
                    {personal.phone && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">P</span>
                        <span>{personal.phone}</span>
                      </div>
                    )}
                    {personal.location && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">L</span>
                        <span>{personal.location}</span>
                      </div>
                    )}
                    {personal.url && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500">W</span>
                        <a href={personal.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-600 transition-colors">{personal.url}</a>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <section className="mb-6">
                <h2 className="resume-section-title text-primary border-primary">{'Summary'}</h2>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</div>
              </section>

              {/* Render based on order */}
              {sectionOrder.filter(t => !['personal', 'summary'].includes(t)).map(type => {
                if (type === 'experience' && exp.items?.length) {
                  return (
                    <section key={type} className="mb-6">
                      <h2 className="resume-section-title text-primary border-primary">{t(lang, 'experience')}</h2>
                      <div className="space-y-4">
                        {exp.items.map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-baseline mb-1">
                              <h3 className="font-bold text-gray-800">{item.role}</h3>
                              <span className="text-xs font-medium text-gray-500">{item.start} — {item.end}</span>
                            </div>
                            <div className="text-sm font-medium text-primary mb-1">{item.company}</div>
                            <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                }
                if (type === 'education' && edu.items?.length) {
                  return (
                    <section key={type} className="mb-6">
                      <h2 className="resume-section-title text-primary border-primary">{t(lang, 'education')}</h2>
                      <div className="space-y-4">
                        {edu.items.map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-baseline">
                              <h3 className="font-bold text-gray-800">{item.school}</h3>
                              <span className="text-xs text-gray-500">{item.year}</span>
                            </div>
                            <div className="text-sm text-gray-700">{item.degree}</div>
                            {item.details && <p className="text-sm text-gray-600 mt-1">{item.details}</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                }
                if (type === 'skills' && skills.items?.length) {
                  return (
                    <section key={type} className="mb-6">
                      <h2 className="resume-section-title text-primary border-primary">{t(lang, 'skills')}</h2>
                      <div className="flex flex-wrap gap-2">
                        {skills.items.map((s, i) => (
                          <span key={i} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </section>
                  )
                }
                if (type === 'projects' && projects.items?.length) {
                  return (
                    <section key={type} className="mb-6">
                      <h2 className="resume-section-title text-primary border-primary">Projects</h2>
                      <div className="space-y-3">
                        {projects.items.map((item, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-800">{item.name}</h3>
                              {item.link && <a href={item.link} className="text-xs text-blue-600 hover:underline">{item.link}</a>}
                            </div>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                }
                return null
              })}
            </div>
          </div>
        </main>
      </div>

      {/* AI Modal */}
      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>AI Professional Summary</DialogTitle>
            <DialogDescription>
              Let AI analyze your experience and generate a tailored summary.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="jobTitle" className="text-right text-sm font-medium">Job Title</label>
              <Input id="jobTitle" value={aiJobTitle} onChange={(e) => setAiJobTitle(e.target.value)} className="col-span-3" placeholder="e.g. Software Engineer" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="industry" className="text-right text-sm font-medium">Industry</label>
              <Input id="industry" value={aiIndustry} onChange={(e) => setAiIndustry(e.target.value)} className="col-span-3" placeholder="e.g. Tech" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Level</label>
              <Select value={aiLevel} onValueChange={setAiLevel}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiModal(false)}>Cancel</Button>
            <Button onClick={generateSummary} disabled={aiLoading}>
              {aiLoading ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
