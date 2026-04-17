import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import SplashScreen from './components/SplashScreen/SplashScreen'
import Tutorial from './components/Tutorial/Tutorial'
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
import TriExpressPage from './pages/TriExpressPage/TriExpressPage'
import CoursePage from './pages/CoursePage/CoursePage'
import PlantePage from './pages/PlantePage/PlantePage'
import TourPage from './pages/TourPage/TourPage'
import PechePage from './pages/PechePage/PechePage'
import ColoriePage from './pages/ColoriePage/ColoriePage'
import MarchePage from './pages/MarchePage/MarchePage'
import SoinPage from './pages/SoinPage/SoinPage'
import RacesPage from './pages/RacesPage/RacesPage'
import DessinPage from './pages/DessinPage/DessinPage'
import CheminSaisonsPage from './pages/CheminSaisonsPage/CheminSaisonsPage'
import DepensesPage from './pages/DepensesPage/DepensesPage'
import FaqPage from './pages/FaqPage/FaqPage'
import CoursesListePage from './pages/CoursesListePage/CoursesListePage'
import GaleriePage from './pages/GaleriePage/GaleriePage'
import AnniversairePage from './pages/AnniversairePage/AnniversairePage'
import CarteIdentitePage from './pages/CarteIdentitePage/CarteIdentitePage'
import MaladiesPage from './pages/MaladiesPage/MaladiesPage'
import EvenementsPage from './pages/EvenementsPage/EvenementsPage'

const TUTORIAL_KEY = 'chipie-tutorial-done'

function App() {
  const navigate = useNavigate()
  const [showSplash,    setShowSplash]    = useState(true)
  const [showTutorial,  setShowTutorial]  = useState(false)

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
    if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true)
  }, [])

  const handleTutorialDone = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setShowTutorial(false)
  }, [])

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
    <>
      {showSplash   && <SplashScreen onDone={handleSplashDone} />}
      {showTutorial && <Tutorial onDone={handleTutorialDone} />}
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
        <Route path="jeu/tri-express" element={<TriExpressPage />} />
        <Route path="jeu/course" element={<CoursePage />} />
        <Route path="jeu/plante" element={<PlantePage />} />
        <Route path="jeu/tour" element={<TourPage />} />
        <Route path="jeu/peche" element={<PechePage />} />
        <Route path="jeu/colorie" element={<ColoriePage />} />
        <Route path="jeu/marche" element={<MarchePage />} />
        <Route path="jeu/soin" element={<SoinPage />} />
        <Route path="races" element={<RacesPage />} />
        <Route path="jeu/dessin" element={<DessinPage />} />
        <Route path="jeu/saisons" element={<CheminSaisonsPage />} />
        <Route path="depenses" element={<DepensesPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="courses" element={<CoursesListePage />} />
        <Route path="galerie" element={<GaleriePage />} />
        <Route path="anniversaire" element={<AnniversairePage />} />
        <Route path="carte-identite" element={<CarteIdentitePage />} />
        <Route path="maladies" element={<MaladiesPage />} />
        <Route path="evenements" element={<EvenementsPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default App
