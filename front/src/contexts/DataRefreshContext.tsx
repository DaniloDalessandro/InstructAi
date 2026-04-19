"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

type RefreshFunction = () => void | Promise<void>

interface DataRefreshContextType {
  // Registra função de refresh para um tipo de entidade
  registerRefresh: (entityType: string, refreshFn: RefreshFunction) => void
  // Dispara o refresh de um tipo de entidade
  triggerRefresh: (entityType: string) => void
  // Remove a função de refresh ao desmontar o componente
  unregisterRefresh: (entityType: string) => void
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined)

interface DataRefreshProviderProps {
  children: ReactNode
}

export function DataRefreshProvider({ children }: DataRefreshProviderProps) {
  const [refreshFunctions, setRefreshFunctions] = useState<Record<string, RefreshFunction>>({})

  const registerRefresh = React.useCallback((entityType: string, refreshFn: RefreshFunction) => {
    setRefreshFunctions(prev => ({
      ...prev,
      [entityType]: refreshFn
    }))
  }, [])

  const triggerRefresh = React.useCallback((entityType: string) => {
    setRefreshFunctions(prev => {
      const refreshFn = prev[entityType]
      if (refreshFn) {
        refreshFn()
      }
      return prev
    })
  }, [])

  const unregisterRefresh = React.useCallback((entityType: string) => {
    setRefreshFunctions(prev => {
      const { [entityType]: _, ...rest } = prev
      return rest
    })
  }, [])

  const contextValue = React.useMemo(() => ({
    registerRefresh,
    triggerRefresh,
    unregisterRefresh
  }), [registerRefresh, triggerRefresh, unregisterRefresh])

  return (
    <DataRefreshContext.Provider value={contextValue}>
      {children}
    </DataRefreshContext.Provider>
  )
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext)
  if (context === undefined) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider')
  }
  return context
}

// Hook auxiliar para registrar função de refresh em páginas
export function useRegisterRefresh(entityType: string, refreshFn: RefreshFunction) {
  const { registerRefresh, unregisterRefresh } = useDataRefresh()
  
  React.useEffect(() => {
    registerRefresh(entityType, refreshFn)
    
    return () => {
      unregisterRefresh(entityType)
    }
  }, [entityType, registerRefresh, unregisterRefresh])
}