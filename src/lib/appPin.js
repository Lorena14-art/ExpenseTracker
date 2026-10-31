const STORAGE_KEY = 'expense-tracker-pin'

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)))
}

async function hashPin(pin, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('PIN protection requires Web Crypto in a secure browser context.')
  }
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

export function loadPinCredential() {
  const value = localStorage.getItem(STORAGE_KEY)
  if (!value) return null

  const credential = JSON.parse(value)
  if (
    typeof credential?.salt !== 'string' ||
    !/^[0-9a-f]{32}$/i.test(credential.salt) ||
    typeof credential.hash !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(credential.hash)
  ) {
    throw new Error('Saved PIN settings are invalid. Clear this site’s local storage to reset the app lock.')
  }
  return credential
}

export async function createPinCredential(pin) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('PIN protection requires secure random number support.')
  }
  const salt = bytesToHex(globalThis.crypto.getRandomValues(new Uint8Array(16)))
  const hash = await hashPin(pin, salt)
  const credential = { salt, hash }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credential))
  return credential
}

export async function verifyPin(pin, credential) {
  const actual = hexToBytes(await hashPin(pin, credential.salt))
  const expected = hexToBytes(credential.hash)
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index]
  }
  return difference === 0
}

export function removePinCredential() {
  localStorage.removeItem(STORAGE_KEY)
}
