import { useState } from 'react'
import { Alexandria } from './components/Alexandria'
import { CVAlexandria } from './components/CVAlexandria'
import './App.css'

function App() {
  const [view, setView] = useState<'engine' | 'cv'>('cv')

  return (
    <>
      <nav className="view-nav">
        <button
          className={`view-tab ${view === 'cv' ? 'active' : ''}`}
          onClick={() => setView('cv')}
        >
          CV
        </button>
        <button
          className={`view-tab ${view === 'engine' ? 'active' : ''}`}
          onClick={() => setView('engine')}
        >
          Engine Demo
        </button>
      </nav>
      {view === 'cv' ? <CVAlexandria /> : <Alexandria />}
    </>
  )
}

export default App
