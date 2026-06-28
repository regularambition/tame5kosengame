type TitleScreenProps = {
    onStart: () => void
}

export function TitleScreen({ onStart }: TitleScreenProps) {
    return (
        <main className="screen title-screen" onClick={onStart}>
            <h1 className="game-title">ブラウザゲーム</h1>
            <p className="start-message">CLICK ANYWHERE TO START</p>
        </main>
    )
}