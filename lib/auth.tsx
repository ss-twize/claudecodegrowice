'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'владелец' | 'администратор'

interface AuthContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  isOwner: boolean
}

const AuthContext = createContext<AuthContextType>({
  role: 'владелец',
  setRole: () => {},
  isOwner: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('владелец')

  useEffect(() => {
    const saved = localStorage.getItem('growice_role') as UserRole | null
    if (saved === 'владелец' || saved === 'администратор') setRoleState(saved)
  }, [])

  const setRole = (r: UserRole) => {
    setRoleState(r)
    localStorage.setItem('growice_role', r)
  }

  return (
    <AuthContext.Provider value={{ role, setRole, isOwner: role === 'владелец' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
