export const PROFILE_OPTIONS = [
  {
    key: 'PACIENTE',
    title: 'Paciente',
    description: 'Accede a tus citas e historial médico',
    cta: 'Ingresar como Paciente',
    icon: 'user',
    color: 'blue',
  },
  {
    key: 'MEDICO',
    title: 'Médico',
    description: 'Gestiona consultas y pacientes',
    cta: 'Ingresar como Médico',
    icon: 'stethoscope',
    color: 'green',
  },
  {
    key: 'ADMINISTRADOR',
    title: 'Administrador',
    description: 'Control total del sistema',
    cta: 'Ingresar como Administrador',
    icon: 'shield',
    color: 'purple',
  },
  {
    key: 'CAJA',
    title: 'Caja',
    description: 'Gestión de pagos y facturación',
    cta: 'Ingresar como Caja',
    icon: 'wallet',
    color: 'orange',
  },
]

export const THEME_BY_COLOR = {
  blue: {
    activeCard: 'from-blue-500 to-blue-600 text-white shadow-blue-400/50',
    activeButton: 'from-blue-300 to-blue-400 text-white',
    icon: 'text-blue-500',
  },
  green: {
    activeCard: 'from-green-400 to-green-500 text-white shadow-green-300/50',
    activeButton: 'from-green-300 to-emerald-300 text-white',
    icon: 'text-green-500',
  },
  purple: {
    activeCard: 'from-purple-500 to-fuchsia-500 text-white shadow-purple-300/50',
    activeButton: 'from-purple-300 to-fuchsia-300 text-white',
    icon: 'text-purple-500',
  },
  orange: {
    activeCard: 'from-orange-500 to-orange-600 text-white shadow-orange-300/50',
    activeButton: 'from-orange-300 to-amber-300 text-white',
    icon: 'text-orange-500',
  },
}

