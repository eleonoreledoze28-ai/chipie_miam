import { useRef, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../Header/Header'
import NavBar from '../NavBar/NavBar'
import styles from './Layout.module.css'

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [anim, setAnim] = useState<'enter' | 'exit' | 'idle'>('idle')
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname
      setAnim('exit')
      const t = setTimeout(() => {
        setDisplayChildren(children)
        setAnim('enter')
        const t2 = setTimeout(() => setAnim('idle'), 200)
        return () => clearTimeout(t2)
      }, 120)
      return () => clearTimeout(t)
    } else {
      setDisplayChildren(children)
    }
  }, [location.pathname, children])

  return (
    <div className={`${styles.pageWrap} ${anim === 'exit' ? styles.pageExit : ''} ${anim === 'enter' ? styles.pageEnter : ''}`}>
      {displayChildren}
    </div>
  )
}

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <NavBar />
    </div>
  )
}
