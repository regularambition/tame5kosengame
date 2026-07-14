import "./InBattleScreen.css";

import {useState, useEffect, ReactNode} from "react";

import {Button} from "./ui/Button";
import {ButtonRow} from "./ui/ButtonRow";
import {BackArrowButton} from "./ui/BackArrowButton";
import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {GameSettings} from "../types/GameSettings";
import {AnnotationText} from "./ui/AnnotationText";
import {TextInput} from "./ui/TextInput";
import {DEFAULT_MATCH_RULES} from "../types/MatchRules";
import {createPrivateRoom} from "../api/createPrivateRoom";
import {enterPrivateRoom} from "../api/enterPrivateRoom";
import {leavePrivateRoom} from "../api/leavePrivateRoom";
import {deletePrivateRoom} from "../api/deletePrivateRoom";
import {watchPrivateRoomState, watchGuestName} from "../api/watchPrivateRoom";
import {markAsReady} from "../api/markAsReady";

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

  return (
    <main className="screen not-playing-text-general using-full-height vertical-alignment vertical-even">
      <PlayerStatusDiv userName={matchInfo.player2Name} className="panel-p2"></PlayerStatusDiv>
      {gamePhase === GAME_PHASES.INTRO && <IntroPhaseDiv matchInfo={matchInfo}></IntroPhaseDiv>}
      <PlayerStatusDiv
        userName={matchInfo.player1Name}
        className="panel-p1"
        isPlayer={matchInfo.isPlayer}
      ></PlayerStatusDiv>
    </main>
  );
}
