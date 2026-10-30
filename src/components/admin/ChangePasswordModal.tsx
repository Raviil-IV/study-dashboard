import { useState, type FormEvent } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import type { AdminUser } from '../../types/admin'

export default function ChangePasswordModal({
  user,
  onClose,
  onSubmit,
}: {
  user: AdminUser
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }
    if (password.length > 128) {
      setError('Пароль слишком длинный')
      return
    }
    if (password !== repeat) {
      setError('Пароли не совпадают')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit(password)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Смена пароля — ${user.login}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Повторите пароль"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
