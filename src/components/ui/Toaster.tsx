import { useEffect } from 'react'
import { useToast } from '../../lib/toast'

export default function Toaster() {
  const message = useToast((s) => s.message)
  const hide = useToast((s) => s.hide)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(hide, 4000)
    return () => clearTimeout(timer)
  }, [message, hide])

  if (!message) return null

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
    >
      {message}
    </div>
  )
}
