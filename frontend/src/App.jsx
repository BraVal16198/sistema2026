import AppRouter from './app/AppRouter'
import { AppMessageProvider } from './context/AppMessageContext'

function App() {
  return (
    <AppMessageProvider>
      <AppRouter />
    </AppMessageProvider>
  )
}

export default App
