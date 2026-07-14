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

type MainDivProps = {
  children: ReactNode;
  className?: string;
};
function MainDiv({children, className = "", ...props}: MainDivProps) {
  return (
    <CenterAligningDiv
      className={`vertical-alignment horizontal-centering vertical-centering main-part ${className}`}
      {...props}
    >
      {children}
    </CenterAligningDiv>
  );
}

type PlayerStatusDivProps = {
  userName: string;
  className?: string;
  isPlayer?: boolean;
};
function PlayerStatusDiv({userName, className = "", isPlayer = false}: PlayerStatusDivProps) {
  return (
    <CenterAligningDiv>
      <table className={className}>
        <tbody>
          <tr>
            <td>1点</td>
            <td>
              {userName}
              {isPlayer && " (You)"}
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

type SelectingPhaseDivProps = {matchInfo: MatchInfo};
function SelectingPhaseDiv({matchInfo}: SelectingPhaseDivProps) {
  const {matchPoint, thinkingTimeInSec} = matchInfo;
  return (
    <MainDiv>
      <div className="card-container">
        <IconButton
          className="card-button"
          iconSrc={HANDS.CHARGE.imageSrc}
          label={HANDS.CHARGE.label}
          // onClick={onClick}
          // disabled={disabled}
        />
        <IconButton
          className="card-button"
          iconSrc={HANDS.DEFENSE.imageSrc}
          label={HANDS.DEFENSE.label}
          // onClick={onClick}
          // disabled={disabled}
        />
        <IconButton
          className="card-button"
          iconSrc={HANDS.ATTACK.imageSrc}
          label={HANDS.ATTACK.label}
          // onClick={onClick}
          // disabled={disabled}
        />
        <IconButton
          className="card-button"
          iconSrc={HANDS.BEAM.imageSrc}
          label={HANDS.BEAM.label}
          // onClick={onClick}
          // disabled={disabled}
        />
      </div>
      <Button>確定</Button>
    </MainDiv>
  );
}

type InBattleScreenProps = {
  matchInfo: MatchInfo;
};
export function InBattleScreen({matchInfo}: InBattleScreenProps) {
  function debug() {
    const {
      roomId,
      isPrivateMatch,
      isPlayer,
      player1Name,
      player2Name,
      matchPoint,
      thinkingTimeInSec,
    } = matchInfo;
    console.log(`contents of matchInfo:`);
    console.log(`roomId = ${roomId}`);
    console.log(`isPrivateMatch = ${isPrivateMatch}`);
    console.log(`isPlayer = ${isPlayer}`);
    console.log(`player1Name = ${player1Name}`);
    console.log(`player2Name = ${player2Name}`);
    console.log(`matchPoint = ${matchPoint}`);
    console.log(`thinkingTimeInSec = ${thinkingTimeInSec}`);
  }

  useEffect(() => {
    debug();
  }, [matchInfo]);

  const [gamePhase, setGamePhase] = useState<GamePhase>(GAME_PHASES.INTRO);

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
      <PlayerStatusDiv userName={matchInfo.player2Name} className="panel-p2"></PlayerStatusDiv>
      {gamePhase === GAME_PHASES.INTRO && <IntroPhaseDiv matchInfo={matchInfo}></IntroPhaseDiv>}
      {gamePhase === GAME_PHASES.SELECTING && (
        <SelectingPhaseDiv matchInfo={matchInfo}></SelectingPhaseDiv>
      )}
      <PlayerStatusDiv
        userName={matchInfo.player1Name}
        className="panel-p1"
        isPlayer={matchInfo.isPlayer}
      ></PlayerStatusDiv>
    </main>
  );
}
