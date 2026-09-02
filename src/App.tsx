import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './screens/Dashboard'
import { Ore } from './screens/Ore'
import { StoricoOre } from './screens/StoricoOre'
import { Pagamenti } from './screens/Pagamenti'
import { Contributi } from './screens/Contributi'
import { Altro } from './screens/Altro'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="ore" element={<Ore />} />
          <Route path="ore/storico" element={<StoricoOre />} />
          <Route path="pagamenti" element={<Pagamenti />} />
          <Route path="contributi" element={<Contributi />} />
          <Route path="altro" element={<Altro />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
