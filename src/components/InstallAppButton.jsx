import { useEffect, useState } from 'react'

export default function InstallAppButton({ onInstallComplete }) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    function handleInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  async function installApp() {
    if (!installPrompt) {
      setError('Use your browser menu to install the app or add it to your home screen.')
      return
    }

    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      setError('')
      onInstallComplete?.()
    } catch (installError) {
      console.error('Could not show the app install prompt.', installError)
      setError('Could not open the install prompt. Use your browser menu to install the app.')
    }
  }

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={installApp}
        className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
      >
        Install app
      </button>
      {error && <p role="alert" className="max-w-56 px-3 py-1 text-xs text-[var(--danger)]">{error}</p>}
    </>
  )
}
