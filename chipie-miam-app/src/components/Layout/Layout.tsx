import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import NavBar from '../NavBar/NavBar'
import ChipieParle from '../ChipieParle/ChipieParle'
import AmbientLayer from '../AmbientLayer/AmbientLayer'
import VoiceFab from '../VoiceFab/VoiceFab'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <NavBar />
      <AmbientLayer />
      <VoiceFab />
      <ChipieParle />
    </div>
  )
}
