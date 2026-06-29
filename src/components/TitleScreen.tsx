type TitleScreenProps = {
    onStart: () => void
    isLoading?: boolean
    error?: string
}

export function TitleScreen({ onStart, isLoading = false, error }: TitleScreenProps) {
    return (
        <main
            className="screen title-screen"
            onClick={isLoading ? undefined : onStart}
        >
            <h1 className="game-title">溜め5光線ゲーム</h1>
            <div className="title-status">
                <p className="start-message">
                    {isLoading ? 'LOADING...' : 'CLICK ANYWHERE TO START'}
                </p>
                {error && <p className="title-error">{error}</p>}
            </div>
        </main>
    )
}
