import "./InBattleScreen.css";
import spectatorIcon from "../assets/ui/spectatorCount.png";

import {useState, useEffect, ReactNode} from "react";

import {Button} from "./ui/Button";
import {HANDS} from "../constants/hands";

import {
  isValidJoinCode,
  isValidMatchPoint,
  isValidThinkingTime,
  VALID_NUMBER_RANGE,
  isValidPushId,
  RoomState,
  ROOM_STATES,
  GamePhase,
  GAME_PHASES,
} from "@tame5kosengame/shared";

import {MatchInfo} from "../App";
import {CenterAligningDiv} from "./ui/CenterAligningDiv";
import {ResignButton} from "./ui/ResignButton";
import {IconButton} from "./ui/IconButton";
import {ButtonRow} from "./ui/ButtonRow";
import {initializeAfterIntro} from "../api/inBattle/initializeAfterIntro";
import {watchPrivateRoomGamePhase} from "../api/watchPrivateRoom";

type MainDivProps = {
  children: ReactNode;
  className?: string;
  isVerticalEven?: boolean;
};
function MainDiv({children, className = "", isVerticalEven = false, ...props}: MainDivProps) {
  return (
    <CenterAligningDiv
      className={`vertical-alignment horizontal-centering ${isVerticalEven ? "vertical-even" : "vertical-centering"} main-part ${className}`}
      {...props}
    >
      {children}
    </CenterAligningDiv>
  );
}

type PlayerStatusDivProps = {
  userName: string;
  className?: string;
  isPlayer1: boolean;
  iAmPlayer?: boolean;
};
function PlayerStatusDiv({
  userName,
  className = "",
  isPlayer1,
  iAmPlayer = true,
}: PlayerStatusDivProps) {
  return (
    <CenterAligningDiv>
      <table className={className}>
        <tbody>
          <tr>
            <td>1点</td>
            <td>
              {userName}
              {isPlayer1 && (iAmPlayer ? "(You)" : "(Host)")}
            </td>
            <td>0マナ</td>
          </tr>
        </tbody>
      </table>
    </CenterAligningDiv>
  );
}

type SpectatorUiDivProps = {};
function SpectatorUiDiv({}: SpectatorUiDivProps) {
  return (
    <CenterAligningDiv className="spectator-ui">
      <img className="icon-spectator" src={spectatorIcon} />
      <span>2</span>
    </CenterAligningDiv>
  );
}

type IntroPhaseDivProps = {matchInfo: MatchInfo};
function IntroPhaseDiv({matchInfo}: IntroPhaseDivProps) {
  const {matchPoint, thinkingTimeInSec} = matchInfo;
  return (
    <MainDiv>
      <p>
        ルール
        <br />
        {matchPoint}点先取で勝利
        <br />
        毎ターンの思考時間は{thinkingTimeInSec}秒
        <br />
      </p>
    </MainDiv>
  );
}

type CardButtonProps = {
  src: string;
  label: string;
  disabled?: boolean;
};
function CardButton({src, label, disabled = false}: CardButtonProps) {
  return (
    <IconButton
      className="card-button"
      iconSrc={src}
      label={label}
      // onClick={onClick}
      disabled={disabled}
    />
  );
}

type SelectingPhaseDivProps = {matchInfo: MatchInfo};
function SelectingPhaseDiv({matchInfo}: SelectingPhaseDivProps) {
  const {matchPoint, thinkingTimeInSec} = matchInfo;
  return (
    <MainDiv>
      <p>残り5秒</p>
      <div className="card-container">
        <CardButton src={HANDS.CHARGE.imageSrc} label={HANDS.CHARGE.label} />
        <CardButton src={HANDS.DEFENSE.imageSrc} label={HANDS.DEFENSE.label} />
        <CardButton src={HANDS.ATTACK.imageSrc} label={HANDS.ATTACK.label} />
        <CardButton src={HANDS.BEAM.imageSrc} label={HANDS.BEAM.label} />
      </div>
      <Button>確定</Button>
    </MainDiv>
  );
}

type ChoiceIconProps = {
  src: string;
};
function ChoiceIcon({src}: ChoiceIconProps) {
  return <img className="card-button" src={src} alt="" />;
}

type ResolvedPhaseDivProps = {};
function ResolvedPhaseDiv({}: ResolvedPhaseDivProps) {
  return (
    <MainDiv isVerticalEven={true}>
      <ChoiceIcon src={HANDS.CHARGE.imageSrc} />
      <p>選択が揃った後の処理画面</p>
      <ChoiceIcon src={HANDS.ATTACK.imageSrc} />
    </MainDiv>
  );
}

type FinishedPhaseDivProps = {
  matchInfo: MatchInfo;
};
function FinishedPhaseDiv({matchInfo}: FinishedPhaseDivProps) {
  const findWinner = (matchInfo: MatchInfo) => {
    if (matchInfo.isPlayer) {
      return "YOU";
    } else {
      return "HOST";
    }
  };

  return (
    <MainDiv isVerticalEven={true}>
      <p className="final-score">5 - 3</p>
      <p className="result-description">WINNER: {findWinner(matchInfo)}</p>
      {matchInfo.isPrivateMatch && <Button>戻る</Button>}
      {!matchInfo.isPrivateMatch && (
        <ButtonRow>
          <Button>再戦希望</Button>
          <Button>トップへ戻る</Button>
        </ButtonRow>
      )}
    </MainDiv>
  );
}

type InBattleScreenProps = {
  matchInfo: MatchInfo;
};
export function InBattleScreen({matchInfo}: InBattleScreenProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GAME_PHASES.INTRO);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  function debug() {
    const {
      roomId,
      isPrivateMatch,
      isPlayer,
      iAmHost,
      player1Name,
      player2Name,
      matchPoint,
      thinkingTimeInSec,
    } = matchInfo;
    console.log(`contents of matchInfo:`);
    console.log(`roomId = ${roomId}`);
    console.log(`isPrivateMatch = ${isPrivateMatch}`);
    console.log(`isPlayer = ${isPlayer}`);
    console.log(`iAmHost = ${iAmHost}`);
    console.log(`player1Name = ${player1Name}`);
    console.log(`player2Name = ${player2Name}`);
    console.log(`matchPoint = ${matchPoint}`);
    console.log(`thinkingTimeInSec = ${thinkingTimeInSec}`);
  }

  useEffect(() => {
    debug();

    const timerId = window.setTimeout(async () => {
      try {
        await initializeAfterIntro(matchInfo.roomId);
      } catch (error) {
        console.log("初期化失敗");
        return;
      }
      setHasInitialized(true);
    }, 3000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (gamePhase !== GAME_PHASES.INTRO || !hasInitialized) {
      return;
    }

    const unsubscribe = watchPrivateRoomGamePhase(matchInfo.roomId, (phase: GamePhase) => {
      if (phase === GAME_PHASES.SELECTING) {
        setGamePhase(GAME_PHASES.SELECTING);
      }
    });
    return unsubscribe;
  }, [gamePhase, hasInitialized]);

  function updateGamePhase() {
    if (gamePhase === GAME_PHASES.INTRO) {
      setGamePhase(GAME_PHASES.SELECTING);
    } else if (gamePhase === GAME_PHASES.SELECTING) {
      setGamePhase(GAME_PHASES.RESOLVED);
    } else if (gamePhase === GAME_PHASES.RESOLVED) {
      setGamePhase(GAME_PHASES.FINISHED);
    } else {
      setGamePhase(GAME_PHASES.INTRO);
    }
  }

  return (
    <main className="screen not-playing-text-general using-full-height vertical-alignment vertical-even">
      {matchInfo.isPrivateMatch && <SpectatorUiDiv></SpectatorUiDiv>}
      <ResignButton onClick={updateGamePhase}></ResignButton>
      <PlayerStatusDiv
        userName={matchInfo.player2Name}
        className="panel-p2"
        isPlayer1={false}
      ></PlayerStatusDiv>
      {gamePhase === GAME_PHASES.INTRO && <IntroPhaseDiv matchInfo={matchInfo} />}
      {gamePhase === GAME_PHASES.SELECTING && <SelectingPhaseDiv matchInfo={matchInfo} />}
      {gamePhase === GAME_PHASES.RESOLVED && <ResolvedPhaseDiv />}
      {gamePhase === GAME_PHASES.FINISHED && <FinishedPhaseDiv matchInfo={matchInfo} />}
      <PlayerStatusDiv
        userName={matchInfo.player1Name}
        className="panel-p1"
        isPlayer1={true}
        iAmPlayer={matchInfo.isPlayer}
      ></PlayerStatusDiv>
    </main>
  );
}
