import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../store/auth'
import { Button } from './ui/button'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const { user } = useAuth()
  const [dark, setDark] = useState(() => (
    localStorage.getItem('theme') === 'dark' ||
    (localStorage.getItem('theme') == null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ))

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    if (user) {
      api.put('/api/user/me', { theme: dark ? 'dark' : 'light' }).catch(() => { })
    }
  }, [dark])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
