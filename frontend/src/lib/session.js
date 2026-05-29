export function clearSession() {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (
        key === 'accessToken' ||
        key === 'demoCurrentUsername' ||
        key === 'demoCurrentRole' ||
        key.startsWith('pacienteState:') ||
        key.startsWith('pacienteProfileSnapshot:') ||
        key.startsWith('demoProximasCitas:') ||
        key === 'cajaCierreDia'
      ) {
        localStorage.removeItem(key)
      }
    })
  } catch {
    // ignore
  }
}

export { getTodayIso } from './appointmentDates'
