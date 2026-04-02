import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import GuidePage from './pages/GuidePage/GuidePage'
import DetailPage from './pages/DetailPage/DetailPage'
import JournalPage from './pages/JournalPage/JournalPage'
import StatsPage from './pages/StatsPage/StatsPage'
import ProfilPage from './pages/ProfilPage/ProfilPage'
import SettingsPage from './pages/SettingsPage/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<GuidePage />} />
        <Route path="detail/:id" element={<DetailPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
