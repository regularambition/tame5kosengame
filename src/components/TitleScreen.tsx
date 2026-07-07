import "./TitleScreen.css";

import {CenterAligningDiv} from "./ui/CenterAligningDiv";

type TitleScreenProps = {
  onStart: () => void;
  isLoading?: boolean;
  error?: string;
};

export function TitleScreen({onStart, isLoading = false, error}: TitleScreenProps) {
  return (
    <main
      className="screen using-full-height vertical-alignment horizontal-centering vertical-centering title-screen"
      onClick={isLoading ? undefined : onStart}
    >
      <h1 className="game-title">溜め5光線ゲーム</h1>
      <CenterAligningDiv className="title-status">
        <p className="start-message">{isLoading ? "LOADING..." : "CLICK ANYWHERE TO START"}</p>
        {error && <p className="title-error">{error}</p>}
      </CenterAligningDiv>
    </main>
  );
}
