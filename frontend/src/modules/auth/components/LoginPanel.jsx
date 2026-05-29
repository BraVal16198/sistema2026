import { useState } from 'react'
import { Lock, ShieldCheck, User } from 'lucide-react'

function LoginPanel({
  selectedProfile,
  theme,
  onSubmit,
  onCreatePacienteAccount,
  onForgotPacienteAccount,
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    await onSubmit({ username, password, role: selectedProfile.key })
    setIsLoading(false)
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
        <User className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          required
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
        <Lock className="h-4 w-4 text-slate-400" />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          required
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-3 w-3" />
          Recordar sesión
        </label>
        {selectedProfile.key === 'PACIENTE' ? (
          <button
            type="button"
            onClick={onForgotPacienteAccount}
            className="text-blue-500 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : null}
      </div>

      {selectedProfile.key === 'PACIENTE' ? (
        <button
          type="button"
          onClick={onCreatePacienteAccount}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-700"
        >
          Crear cuenta de Paciente
        </button>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full rounded-lg bg-gradient-to-r py-2.5 text-sm font-semibold disabled:opacity-70 ${theme.activeButton}`}
      >
        {isLoading ? 'Validando...' : selectedProfile.cta}
      </button>

      <div className="mt-5 border-t border-slate-200 pt-5 text-center">
        <ShieldCheck className="mx-auto h-4 w-4 text-slate-400" />
      </div>
    </form>
  )
}

export default LoginPanel

