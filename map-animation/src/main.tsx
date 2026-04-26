import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode intentionally disabled: it double-mounts the Mapbox instance in
// dev, which can leave WebGL contexts in a bad state on some GPU/driver combos.
createRoot(document.getElementById('root')!).render(<App />)
