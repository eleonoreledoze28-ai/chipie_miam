import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
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
import LabyrintePage from './pages/LabyrintePage/LabyrintePage'
import AssiettePage from './pages/AssiettePage/AssiettePage'
import DangerPage from './pages/DangerPage/DangerPage'
import QuizPage from './pages/QuizPage/QuizPage'
import EncyclopediePage from './pages/EncyclopediePage/EncyclopediePage'
import CarnetSantePage from './pages/CarnetSantePage/CarnetSantePage'
import SnakePage from './pages/SnakePage/SnakePage'
import { checkAndFirePending } from './services/notifications'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // Fire any pending notifications (carnet santé reminders, daily feeding)
    void checkAndFirePending()

    // Handle notification clicks: SW sends NAVIGATE message to focus the right page
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string }
      if (data?.type === 'NAVIGATE' && data.url) {
        navigate(data.url)
      }
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => { navigator.serviceWorker?.removeEventListener('message', handler) }
  }, [navigate])

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
        <Route path="jeu/labyrinthe" element={<LabyrintePage />} />
        <Route path="jeu/assiette" element={<AssiettePage />} />
        <Route path="jeu/quiz" element={<QuizPage />} />
        <Route path="danger" element={<DangerPage />} />
        <Route path="encyclopedie" element={<EncyclopediePage />} />
        <Route path="carnet-sante" element={<CarnetSantePage />} />
        <Route path="jeu/snake" element={<SnakePage />} />
      </Route>
    </Routes>
  )
}

export default App
