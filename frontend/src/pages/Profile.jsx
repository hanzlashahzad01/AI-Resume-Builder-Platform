import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card'
import { useAuth } from '../store/auth'
import { User, Mail, Save } from 'lucide-react'

export default function Profile() {
    const { user, setAuth } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ name: '', email: '' })

    useEffect(() => {
        if (user) {
            setForm({ name: user.name || '', email: user.email || '' })
        }
    }, [user])

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data } = await api.put('/api/user/me', { name: form.name, email: form.email })
            setAuth({ user: data.user })
            alert('Profile updated!')
        } catch (err) {
            alert('Failed to update')
        } finally {
            setLoading(false)
        }
    }

    // Avatar upload handler removed

    return (
        <div className="max-w-xl mx-auto py-10 space-y-6">
            <h1 className="text-3xl font-bold">Profile Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your public profile and settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar upload removed as per request */}


                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="pl-9" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="pl-9" />
                            </div>
                        </div>
                        <Button disabled={loading}>
                            {loading ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground">
                <Link to="/dashboard" className="hover:underline">Back to Dashboard</Link>
            </div>
        </div>
    )
}
// Settings component can reuse this or simple redirect for now
