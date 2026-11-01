import { useEffect, useRef, useState } from 'react'
import {
  createPinCredential,
  loadPinCredential,
  removePinCredential,
  verifyPin,
} from '../lib/appPin'

function readSavedPin() {
  try {
    return { credential: loadPinCredential(), error: '' }
  } catch (error) {
    return {
      credential: null,
      error: error instanceof Error ? error.message : 'Could not read the saved PIN settings.',
    }
  }
}

const pinInputClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-3 text-center text-xl tracking-[0.4em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
const buttonClass =
  'w-full cursor-pointer rounded-md bg-[var(--accent)] px-3 py-2.5 font-semibold text-[var(--onaccent)] hover:bg-[var(--accent-h)]'

export default function PinGate({ children }) {
  const [savedPin, setSavedPin] = useState(readSavedPin)
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsDialog = useRef(null)

  useEffect(() => {
    if (settingsOpen && !settingsDialog.current?.open) {
      settingsDialog.current?.showModal()
    }
  }, [settingsOpen])

  async function unlock(event) {
    event.preventDefault()
    try {
      if (await verifyPin(pin, savedPin.credential)) {
        setUnlocked(true)
        setPin('')
        setError('')
      } else {
        setError('That PIN is incorrect.')
        setPin('')
      }
    } catch (unlockError) {
      console.error('Could not verify the app PIN.', unlockError)
      setError('Could not verify the PIN. Check that this browser supports secure Web Crypto.')
    }
  }

  async function savePin(event) {
    event.preventDefault()
    if (!/^\d{6}$/.test(pin)) {
      setError('Enter a six-digit PIN.')
      return
    }
    if (pin !== confirmation) {
      setError('The PINs do not match.')
      return
    }

    try {
      const credential = await createPinCredential(pin)
      setSavedPin({ credential, error: '' })
      setUnlocked(true)
      setSettingsOpen(false)
      setPin('')
      setConfirmation('')
      setError('')
    } catch (saveError) {
      console.error('Could not save the app PIN.', saveError)
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the PIN. Please try again.'
      )
    }
  }

  function disablePin() {
    try {
      removePinCredential()
      setSavedPin({ credential: null, error: '' })
      setSettingsOpen(false)
      setPin('')
      setConfirmation('')
      setError('')
    } catch (disableError) {
      console.error('Could not disable the app PIN.', disableError)
      setError('Could not disable the PIN. Please try again.')
    }
  }

  function openSettings() {
    setPin('')
    setConfirmation('')
    setError('')
    setSettingsOpen(true)
  }

  if (savedPin.error) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-4 px-5 text-[var(--text)]">
        <h1 className="text-xl font-semibold">App lock unavailable</h1>
        <p role="alert" className="text-sm text-[var(--danger)]">{savedPin.error}</p>
        <p className="text-sm text-[var(--muted)]">
          This lock only hides the app interface; it does not encrypt expenses stored in this browser.
        </p>
      </main>
    )
  }

  if (!savedPin.credential) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-5 px-5 text-[var(--text)]">
        <img
          src="/expense-tracker-logo.png"
          alt="Expense Tracker"
          className="mx-auto h-16 w-auto max-w-full object-contain"
        />
        <form onSubmit={savePin} className="grid gap-3">
          <h1 className="text-center text-xl font-semibold">Set your app PIN</h1>
          <p className="text-center text-sm text-[var(--muted)]">
            Create a six-digit PIN to continue to Expense Tracker.
          </p>
          <label htmlFor="new-pin" className="text-sm">Six-digit PIN</label>
          <input
            id="new-pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
            className={pinInputClass}
          />
          <label htmlFor="confirm-pin" className="text-sm">Confirm PIN</label>
          <input
            id="confirm-pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
            className={pinInputClass}
          />
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" className={buttonClass}>Set PIN and continue</button>
        </form>
        <p className="text-center text-xs text-[var(--muted)]">
          This PIN hides the app screen but does not encrypt your locally stored data.
        </p>
      </main>
    )
  }

  if (!unlocked) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-5 px-5 text-[var(--text)]">
        <img
          src="/expense-tracker-logo.png"
          alt="Expense Tracker"
          className="mx-auto h-16 w-auto max-w-full object-contain"
        />
        <form onSubmit={unlock} className="grid gap-3">
          <label htmlFor="unlock-pin" className="text-center text-sm text-[var(--muted)]">
            Enter your six-digit PIN to unlock
          </label>
          <input
            id="unlock-pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
            className={pinInputClass}
          />
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" className={buttonClass}>Unlock</button>
        </form>
        <p className="text-center text-xs text-[var(--muted)]">
          This PIN hides the app screen but does not encrypt your locally stored data.
        </p>
      </main>
    )
  }

  return (
    <>
      {children({
        pinEnabled: Boolean(savedPin.credential),
        onLock: () => setUnlocked(false),
        onOpenPinSettings: openSettings,
      })}
      {settingsOpen && (
        <dialog
          ref={settingsDialog}
          aria-labelledby="pin-settings-title"
          onClose={() => setSettingsOpen(false)}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-[var(--text)] shadow-xl backdrop:bg-black/50"
        >
          <form onSubmit={savePin} className="grid gap-3">
            <h2 id="pin-settings-title" className="text-lg font-semibold">
              {savedPin.credential ? 'Change app PIN' : 'Set up app PIN'}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              The app will ask for this PIN when opened again. It adds a privacy screen but does not encrypt expense data.
            </p>
            <label htmlFor="new-pin" className="text-sm">Six-digit PIN</label>
            <input
              id="new-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              className={pinInputClass}
            />
            <label htmlFor="confirm-pin" className="text-sm">Confirm PIN</label>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              className={pinInputClass}
            />
            {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
            <button type="submit" className={buttonClass}>
              {savedPin.credential ? 'Save new PIN' : 'Set PIN'}
            </button>
            <button
              type="button"
              onClick={() => {
                settingsDialog.current?.close()
                setError('')
              }}
              className="w-full cursor-pointer rounded-md border border-[var(--line)] px-3 py-2.5 font-semibold hover:border-[var(--muted)]"
            >
              Cancel
            </button>
            {savedPin.credential && (
              <button
                type="button"
                onClick={disablePin}
                className="w-full cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--danger)] hover:underline"
              >
                Disable PIN
              </button>
            )}
          </form>
        </dialog>
      )}
    </>
  )
}
