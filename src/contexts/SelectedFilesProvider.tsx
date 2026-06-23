import { useState, useCallback, ReactNode } from 'react'
import { SelectedFilesContext } from './SelectedFilesContext'

export function SelectedFilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<string[]>([])

  const addFile = useCallback((path: string) => {
    setFiles(prev => prev.includes(path) ? prev : [...prev, path])
  }, [])

  const removeFile = useCallback((path: string) => {
    setFiles(prev => prev.filter(f => f !== path))
  }, [])

  const toggleFile = useCallback((path: string) => {
    setFiles(prev => prev.includes(path)
      ? prev.filter(f => f !== path)
      : [...prev, path])
  }, [])

  const clearFiles = useCallback(() => setFiles([]), [])

  const isSelected = useCallback((path: string) => files.includes(path), [files])

  return (
    <SelectedFilesContext.Provider value={{
      files, addFile, removeFile, toggleFile, clearFiles, isSelected
    }}>
      {children}
    </SelectedFilesContext.Provider>
  )
}
