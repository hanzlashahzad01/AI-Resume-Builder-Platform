import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../store/auth'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Plus, MoreVertical, FileText, Download, Eye, Sparkles, Copy, Trash2, Share2, ExternalLink, Mail, Linkedin } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalResumes: 0, totalDownloads: 0, totalViews: 0, recentActivity: [] })
  const [suggestions, setSuggestions] = useState([])
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [currentShareItem, setCurrentShareItem] = useState(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [resumesRes, statsRes, suggRes] = await Promise.all([
        api.get('/api/resume'),
        api.get('/api/user/stats'),
        api.get('/api/user/suggestions'),
      ])
      setItems(resumesRes.data)
      setStats(statsRes.data)
      setSuggestions(suggRes.data?.suggestions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const downloadsSeries = useMemo(() => {
    const map = new Map()
    // Mocking some data if empty for visual appeal in this demo
    // In production, remove this mock or ensure backend returns correct data
    if ((stats.recentActivity || []).length === 0) {
      return [
        { date: '2024-01', count: 4 },
        { date: '2024-02', count: 12 },
        { date: '2024-03', count: 8 },
        { date: '2024-04', count: 25 },
        { date: '2024-05', count: 18 },
      ]
    }

    for (const a of (stats.recentActivity || [])) {
      const d = new Date(a.at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    }
    const arr = Array.from(map.entries()).map(([date, count]) => ({ date, count }))
    arr.sort((a, b) => a.date.localeCompare(b.date))
    return arr
  }, [stats.recentActivity])

  useEffect(() => { load() }, [])

  const createResume = async () => {
    try {
      console.log('Creating resume...')
      const payload = { title: 'Untitled Resume', template: 'modern', sections: [], order: [] }
      const { data } = await api.post('/api/resume', payload)
      console.log('Created:', data)
      navigate(`/resume/${data._id}`)
    } catch (err) {
      console.error('Create failed:', err)
      const msg = err.response?.data?.message || err.message || 'Unknown error'
      alert(`Failed to create resume: ${msg}`)
    }
  }

  const remove = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return
    await api.delete(`/api/resume/${id}`)
    load()
  }

  const duplicate = async (id) => {
    const { data } = await api.post(`/api/resume/${id}/duplicate`)
    navigate(`/resume/${data._id}`)
  }

  const toggleShare = async (item) => {
    try {
      // If already public, just open the modal
      if (item.isPublic) {
        setCurrentShareItem(item)
        setShareModalOpen(true)
        return
      }

      // If not public, make it public then open modal
      let payload = { isPublic: true }
      const { data } = await api.post(`/api/resume/${item._id}/share`, payload)
      const next = items.map(r => r._id === item._id ? { ...r, ...data } : r)
      setItems(next)
      setCurrentShareItem({ ...item, ...data })
      setShareModalOpen(true)
    } catch (err) {
      console.error(err)
      alert('Failed to update share settings.')
    }
  }

  const getShareUrl = (item) => {
    if (!item?.shareId) return ''
    return `${window.location.origin}/public/${item.shareId}`
  }

  const copyToClipboard = () => {
    const url = getShareUrl(currentShareItem)
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const shareWhatsapp = () => {
    const url = encodeURIComponent(getShareUrl(currentShareItem))
    window.open(`https://wa.me/?text=Check%20out%20my%20resume:%20${url}`, '_blank')
  }

  const shareLinkedin = () => {
    const url = encodeURIComponent(getShareUrl(currentShareItem))
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank')
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name || 'User'}. Here's what's happening with your resumes.</p>
        </div>
        <Button onClick={createResume} className="gap-2">
          <Plus className="h-4 w-4" /> Create Resume
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResumes}</div>
            <p className="text-xs text-muted-foreground">Drafts and published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">Across all shared links</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Performance</CardTitle>
                <CardDescription>Resume views and downloads over time.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={downloadsSeries} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(str) => {
                          const date = new Date(str)
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: 'hsl(var(--popover-foreground))'
                        }}
                        itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 600 }}
                        formatter={(value) => [value, 'Views/Downloads']}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Resumes</CardTitle>
                <CardDescription>
                  You have {items.length} resumes total.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.slice(0, 4).map(item => (
                    <div key={item._id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.updatedAt || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Link to={`/resume/${item._id}`}>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </Link>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-muted-foreground">No resumes created yet.</p>}
                  <Button variant="outline" className="w-full" onClick={createResume}>
                    Create New
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map(r => {
              return (
                <Card key={r._id} className="group overflow-hidden transition-all hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{r.title}</CardTitle>
                        <CardDescription className="capitalize mt-1">{r.template} Template</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/resume/${r._id}`)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(r._id)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleShare(r)}>
                            <Share2 className="mr-2 h-4 w-4" /> {r.isPublic ? 'Private' : 'Share Publicly'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(r._id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> {r.views || 0}</div>
                      <div className="flex items-center gap-1"><Download className="h-3 w-3" /> {r.downloads || 0}</div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 justify-end gap-2">
                    {r.isPublic && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => window.open(`/public/${r.shareId}`, '_blank')}>
                        <ExternalLink className="mr-1 h-3 w-3" /> View
                      </Button>
                    )}
                    <Link to={`/resume/${r._id}`} className="w-full">
                      <Button className="w-full">Open Editor</Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>A log of your recent actions and formatting events.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {stats.recentActivity?.map((a, i) => (
                  <li key={i} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="mt-1 bg-primary/10 p-2 rounded-full text-primary">
                      {a.type === 'download' ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {a.type === 'download' ? 'Downloaded Resume' : 'Viewed Resume'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {a.type} action on resume <span className="font-medium text-foreground">{a.resume || 'Unknown'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
                {(!stats.recentActivity || stats.recentActivity.length === 0) && (
                  <p className="text-muted-foreground">No recent activity.</p>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="suggestions">
          <div className="space-y-4">
            {suggestions.map((s, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    AI Suggestion for {s.resumeTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
                <CardFooter>
                  <Link to={`/resume/${s.resumeId}`}>
                    <Button size="sm" variant="outline">Apply in Editor</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
            {suggestions.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <Sparkles className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No suggestions yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Use the AI tools inside the Resume Editor to generate professional summaries and skill suggestions. They will appear here.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Resume</DialogTitle>
            <DialogDescription>
              Your resume is now public. Share this link with recruiters or social networks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                id="link"
                defaultValue={getShareUrl(currentShareItem)}
                readOnly
              />
            </div>
            <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard}>
              <span className="sr-only">Copy</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center gap-4 py-4">
            <Button variant="outline" className="flex-1 gap-2 bg-green-50 text-green-600 hover:bg-green-100 border-green-200" onClick={shareWhatsapp}>
              <Share2 className="h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" className="flex-1 gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={shareLinkedin}>
              <Linkedin className="h-4 w-4" /> LinkedIn
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShareModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
