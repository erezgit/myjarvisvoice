import { X } from 'lucide-react'

interface FileContextChipsProps {
  files: string[]
  onRemove: (path: string) => void
}

export function FileContextChips({ files, onRemove }: FileContextChipsProps) {
  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {files.map(path => {
        const filename = path.split('/').pop() || path
        return (
          <div
            key={path}
            className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30
                       text-green-800 dark:text-green-300 rounded-full text-sm"
            title={path}
          >
            <span className="truncate max-w-[150px]">{filename}</span>
            <button
              onClick={() => onRemove(path)}
              className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
