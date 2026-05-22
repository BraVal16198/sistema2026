import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { SystemMessageDialog } from '../components/SystemMessageDialog'

const AppMessageContext = createContext(null)

export function AppMessageProvider({ children }) {
  const onOkRef = useRef(null)
  const [state, setState] = useState({
    open: false,
    message: '',
    title: 'Mensaje',
    variant: 'info',
  })

  const showMessage = useCallback((message, options = {}) => {
    onOkRef.current = typeof options.onOk === 'function' ? options.onOk : null
    setState({
      open: true,
      message: message ?? '',
      title: options.title ?? 'Mensaje',
      variant: options.variant ?? 'info',
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const cb = onOkRef.current
    onOkRef.current = null
    setState((prev) => ({
      ...prev,
      open: false,
      message: '',
      title: 'Mensaje',
      variant: 'info',
    }))
    cb?.()
  }, [])

  const value = useMemo(() => ({ showMessage }), [showMessage])

  return (
    <AppMessageContext.Provider value={value}>
      {children}
      <SystemMessageDialog
        open={state.open}
        title={state.title}
        message={state.message}
        variant={state.variant}
        onConfirm={handleConfirm}
      />
    </AppMessageContext.Provider>
  )
}

export function useAppMessage() {
  const ctx = useContext(AppMessageContext)
  if (!ctx) {
    throw new Error('useAppMessage debe usarse dentro de AppMessageProvider')
  }
  return ctx
}
