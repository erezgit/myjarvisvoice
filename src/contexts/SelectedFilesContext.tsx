import { createContext, useContext } from 'react'

export interface SelectedFilesContextType {
  files: string[]
  addFile: (path: string) => void
  removeFile: (path: string) => void
  toggleFile: (path: string) => void
  clearFiles: () => void
  isSelected: (path: string) => boolean
}

export const SelectedFilesContext = createContext<SelectedFilesContextType | null>(null)

export function useSelectedFiles() {
  const context = useContext(SelectedFilesContext)
  if (!context) {
    throw new Error('useSelectedFiles must be used within SelectedFilesProvider')
  }
  return context
}
