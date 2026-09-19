let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

/** Unlock the audio context from a user gesture so completion beeps are allowed. */
export function primeAudio(): void {
  const ctx = getContext()
  if (ctx?.state === 'suspended') void ctx.resume()
}

/** Short double beep signalling that the pomodoro timer finished. */
export function playBeep(): void {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  const notes: Array<[number, number]> = [
    [0, 880],
    [0.18, 660],
  ]
  for (const [start, freq] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, now + start)
    gain.gain.linearRampToValueAtTime(0.3, now + start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.16)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + start)
    osc.stop(now + start + 0.2)
  }
}