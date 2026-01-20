import { create } from 'zustand'

export const useAuth = create((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken') || null,
  setAuth: ({ user, accessToken }) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken)
    set({ user, accessToken })
  },
  clear: () => {
    localStorage.removeItem('accessToken')
    set({ user: null, accessToken: null })
  },
}))
