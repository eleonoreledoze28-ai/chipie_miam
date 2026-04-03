import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import GuidePage from './pages/GuidePage/GuidePage'
import DetailPage from './pages/DetailPage/DetailPage'
import JournalPage from './pages/JournalPage/JournalPage'
import StatsPage from './pages/StatsPage/StatsPage'
import ProfilPage from './pages/ProfilPage/ProfilPage'
import SettingsPage from './pages/SettingsPage/SettingsPage'
import JeuxHubPage from './pages/JeuxHubPage/JeuxHubPage'
import JeuPage from './pages/JeuPage/JeuPage'
import MemoryPage from './pages/MemoryPage/MemoryPage'
import AnagrammePage from './pages/AnagrammePage/AnagrammePage'
import TamagotchiPage from './pages/TamagotchiPage/TamagotchiPage'

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
        <Route path="jeu" element={<JeuxHubPage />} />
        <Route path="jeu/devinette" element={<JeuPage />} />
        <Route path="jeu/memory" element={<MemoryPage />} />
        <Route path="jeu/anagramme" element={<AnagrammePage />} />
        <Route path="jeu/tamagotchi" element={<TamagotchiPage />} />
      </Route>
    </Routes>
  )
}

export default App
