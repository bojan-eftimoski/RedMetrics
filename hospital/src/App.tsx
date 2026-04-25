import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Overview } from './pages/Overview'
import { Forecast } from './pages/Forecast'
import { Sensors } from './pages/Sensors'
import { Historical } from './pages/Historical'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="sensors" element={<Sensors />} />
          <Route path="historical" element={<Historical />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
