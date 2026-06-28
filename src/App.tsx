import { useState } from 'react'
import './App.css'
import { TitleScreen } from './components/TitleScreen'
import { TopScreen } from './components/TopScreen'

type Screen = 'title' | 'top'

function App() {
    const [screen, setScreen] = useState<Screen>('title')

    if (screen === 'title') {
        return <TitleScreen onStart={() => setScreen('top')} />
    }

    return <TopScreen />
}

export default App