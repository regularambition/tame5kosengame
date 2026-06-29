import { useState } from 'react'
import './App.css'
import { signInAnonymously } from 'firebase/auth'
import { get, ref, serverTimestamp, set } from 'firebase/database'
import { TitleScreen } from './components/TitleScreen'
import { TopScreen } from './components/TopScreen'
import { UserNameScreen } from './components/UserNameScreen'
import { auth, database } from './firebase'

type Screen = 'title' | 'userName' | 'top'

function App() {
    const [screen, setScreen] = useState<Screen>('title')
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [authError, setAuthError] = useState('')

    const handleStart = async () => {
        if (isAuthenticating) {
            return
        }

        try {
            setIsAuthenticating(true)
            setAuthError('')

            const { user } = await signInAnonymously(auth)
            const userSnapshot = await get(ref(database, `users/${user.uid}`))

            setScreen(userSnapshot.exists() ? 'top' : 'userName')
        } catch {
            setAuthError('認証に失敗しました。もう一度クリックしてください')
        } finally {
            setIsAuthenticating(false)
        }
    }

    const handleRegisterName = async (name: string) => {
        const currentUser = auth.currentUser

        if (!currentUser) {
            setScreen('title')
            setAuthError('認証情報が見つかりません。もう一度お試しください')
            return
        }

        await set(ref(database, `users/${currentUser.uid}`), {
            name,
            createdAt: serverTimestamp(),
        })
        setScreen('top')
    }

    if (screen === 'title') {
        return (
            <TitleScreen
                error={authError}
                isLoading={isAuthenticating}
                onStart={handleStart}
            />
        )
    }

    if (screen === 'userName') {
        return <UserNameScreen onSubmit={handleRegisterName} />
    }

    return <TopScreen />
}

export default App
