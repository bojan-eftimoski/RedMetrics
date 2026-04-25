import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Portfolio } from './pages/Portfolio'
import { Monitor } from './pages/Monitor'
import { Events } from './pages/Events'
import { Simulate } from './pages/Simulate'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Portfolio />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="events" element={<Events />} />
          <Route path="simulate" element={<Simulate />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
