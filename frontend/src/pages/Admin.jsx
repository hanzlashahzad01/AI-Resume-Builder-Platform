import { useEffect, useState } from 'react'
import api from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Plus, Trash2, Users, FileStack, LayoutTemplate } from 'lucide-react'

export default function Admin() {
  const [templates, setTemplates] = useState([])
  const [usersCount, setUsersCount] = useState(0)
  const [resumesCount, setResumesCount] = useState(0)
  const [form, setForm] = useState({ key: '', name: '' })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [tplRes, usersRes, resumeRes] = await Promise.all([
        api.get('/api/templates'),
        // assuming these endpoints exist or mocking them for now
        // api.get('/api/admin/stats/users'), 
        // api.get('/api/admin/stats/resumes')
        Promise.resolve({ data: { count: 120 } }), // Mock
        Promise.resolve({ data: { count: 450 } })  // Mock
      ])
      setTemplates(tplRes.data)
      setUsersCount(usersRes.data.count)
      setResumesCount(resumeRes.data.count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!form.key || !form.name) return
    await api.post('/api/templates', form)
    setForm({ key: '', name: '' })
    load()
  }

  const remove = async (id) => {
    if (!confirm('Delete this template?')) return
    await api.delete(`/api/templates/${id}`)
    load()
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage platform resources, templates, and view statistics.</p>
        </div>
        <Button onClick={load} variant="outline">Refresh Data</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount}</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
            <FileStack className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumesCount}</div>
            <p className="text-xs text-muted-foreground">Active documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">Available to users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Template */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Template</CardTitle>
            <CardDescription>Register a new template key for the renderer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="key" className="text-sm font-medium">Template Key</label>
                <Input id="key" placeholder="e.g. executive-pro" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
                <p className="text-[0.8rem] text-muted-foreground">Must match the CSS class name prefix.</p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">Display Name</label>
                <Input id="name" placeholder="e.g. Executive Pro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Template
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Template List */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Templates</CardTitle>
            <CardDescription>Existing templates in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {templates.map(t => (
                <div key={t._id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded text-primary">
                      <LayoutTemplate className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.key}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(t._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {templates.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No templates found.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

