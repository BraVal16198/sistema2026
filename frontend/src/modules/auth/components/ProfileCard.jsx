import { ShieldCheck, Stethoscope, User, Wallet } from 'lucide-react'

const icons = {
  user: User,
  stethoscope: Stethoscope,
  shield: ShieldCheck,
  wallet: Wallet,
}

function ProfileCard({ option, isActive, theme, onClick }) {
  const Icon = icons[option.icon]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all duration-200 ${
        isActive
          ? `bg-gradient-to-r ${theme.activeCard} border-transparent shadow-lg`
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
      }`}
    >
      <div className="mb-2 flex justify-center">
        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : theme.icon}`} />
      </div>
      <p className="text-center text-sm font-semibold">{option.title}</p>
      <p className="mt-1 text-center text-xs opacity-90">{option.description}</p>
    </button>
  )
}

export default ProfileCard

