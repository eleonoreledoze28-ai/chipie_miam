import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import NavBar from '../NavBar/NavBar'
import ChipieParle from '../ChipieParle/ChipieParle'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <NavBar />
      <ChipieParle />
    </div>
  )
}
