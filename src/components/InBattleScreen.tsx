import {useState, useEffect} from "react";

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
} from "@tame5kosengame/shared";

import {MatchInfo} from "../App";

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

  return (
    <main className="screen not-playing-text-general">
      <p>対戦中の画面</p>
    </main>
  );
}
