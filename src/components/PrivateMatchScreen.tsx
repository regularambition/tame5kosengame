import {useState, useEffect, useRef} from "react";

import {Button} from "./ui/Button";
import {ButtonRow} from "./ui/ButtonRow";
import {BackArrowButton} from "./ui/BackArrowButton";
import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {AnnotationText} from "./ui/AnnotationText";
import {TextInput} from "./ui/TextInput";
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

import {isHost, isPlayerRole, ROLES_IN_BATTLE, RolesInBattleId} from "../constants/rolesInBattle";
import {MatchInfo} from "../types/MatchInfo";
import {kickGuest} from "../api/kickGuest";

type PrivateMatchScreenProps = {
  matchInfo: MatchInfo;
  onBackToTop: () => void;
  userName: string;
  onStartBattle: (nextMatchInfo: MatchInfo) => void;
};

const STATES = {
  MAKE_OR_ENTER: 0,
  MATCH_RULES_SETTING: 1,
  I_AM_HOST: 2,
  ENTERING_JOIN_CODE: 3,
  I_AM_GUEST_OR_SPECTATOR: 4,
} as const;

type StateId = (typeof STATES)[keyof typeof STATES];

function Div({children, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="using-full-height vertical-alignment horizontal-centering vertical-centering">
      {children}
    </div>
  );
}

type MakeOrEnterDivProps = {
  onClickMake: () => void;
  onClickEnter: () => void;
};

function MakeOrEnterDiv({onClickMake, onClickEnter}: MakeOrEnterDivProps) {
  return (
    <Div>
      <ButtonRow>
        <Button onClick={onClickMake}>部屋を建てる</Button>
        <Button onClick={onClickEnter}>部屋に入る</Button>
      </ButtonRow>
    </Div>
  );
}

type MatchRulesSettingDivProps = {
  onChangeMatchPoint: React.ChangeEventHandler<HTMLInputElement>;
  onChangeThinkingTime: React.ChangeEventHandler<HTMLInputElement>;
  onRoomCreating: () => void | Promise<void>;
  matchPoint: string;
  thinkingTime: string;
  isCreatingRoom: boolean;
  errorMessage: string;
};

function MatchRulesSettingDiv({
  onChangeMatchPoint,
  onChangeThinkingTime,
  onRoomCreating,
  matchPoint,
  thinkingTime,
  isCreatingRoom,
  errorMessage,
}: MatchRulesSettingDivProps) {
  return (
    <Div>
      <AnnotationText>
        ※部屋が建った後はDiscordやTwitter等を利用して
        <br />
        対戦相手や観戦者に参加コード（8桁の数字列）を連携してください
      </AnnotationText>
      <p>
        決着点数（{VALID_NUMBER_RANGE.MATCH_POINT.minimum}以上
        {VALID_NUMBER_RANGE.MATCH_POINT.maximum}以下の整数値）
      </p>
      <TextInput
        onChange={onChangeMatchPoint}
        value={matchPoint}
        disabled={isCreatingRoom}
      ></TextInput>
      <p>
        毎ターンの持ち時間（秒単位、{VALID_NUMBER_RANGE.THINKING_TIME.minimum}以上
        {VALID_NUMBER_RANGE.THINKING_TIME.maximum}以下の整数値）
      </p>
      <TextInput
        onChange={onChangeThinkingTime}
        value={thinkingTime}
        disabled={isCreatingRoom}
      ></TextInput>
      <Button onClick={onRoomCreating} disabled={isCreatingRoom}>
        この条件で建てる
      </Button>
      {errorMessage && <AnnotationText>{errorMessage}</AnnotationText>}
    </Div>
  );
}

type WaitingForGuestDivProps = {
  roomId: string;
  joinCode: string;
  matchPoint: string;
  thinkingTime: string;
  guestName: string;
  onFinishPreparing: () => void | Promise<void>;
  isReadyToFight: boolean;
  errorMessage: string;
};

function WaitingForGuestDiv({
  roomId,
  joinCode,
  matchPoint,
  thinkingTime,
  guestName,
  onFinishPreparing,
  isReadyToFight,
  errorMessage,
}: WaitingForGuestDivProps) {
  const [copyAnnotation, setCopyAnnotation] = useState<string>("");

  const handleCopy = async () => {
    let failed = false;
    try {
      await navigator.clipboard.writeText(joinCode);
    } catch (error) {
      failed = true;
    }

    setCopyAnnotation(failed ? "コピーに失敗しました" : "コピー成功");
    setTimeout(() => setCopyAnnotation(""), 2000); // 2秒後に戻す
  };

  const [isKickProcessing, setIsKickProcessing] = useState<boolean>(false);

  const handleKick = async () => {
    if (isKickProcessing) {
      return;
    }

    setIsKickProcessing(true);
    try {
      await kickGuest(roomId);
    } catch (e) {
      console.log(e);
    }
    setIsKickProcessing(false);
  };

  return (
    <Div>
      <p>
        参加コード：
        <br />
        <span>{joinCode}</span>
      </p>
      <Button onClick={handleCopy} disabled={copyAnnotation.length > 0}>
        参加コードをコピー
      </Button>
      {copyAnnotation.length > 0 && <AnnotationText>{copyAnnotation}</AnnotationText>}
      <p>
        ルール：
        <br />
        {matchPoint}点先取で勝利、選択は{thinkingTime}秒以内
      </p>
      {guestName.length === 0 && <AnnotationText>まだ相手がいません</AnnotationText>}
      {guestName.length > 0 && <p>相手の名前：{guestName}</p>}
      {guestName.length > 0 && (
        <ButtonRow>
          <Button onClick={onFinishPreparing} disabled={isReadyToFight}>
            準備完了
          </Button>
          <Button onClick={handleKick} disabled={isKickProcessing}>
            このゲストを追い出す
          </Button>
        </ButtonRow>
      )}
      {errorMessage && <AnnotationText>{errorMessage}</AnnotationText>}
    </Div>
  );
}

type EnteringJoinCodeDivProps = {
  isPlayer: boolean;
  onClickEnter: () => void | Promise<void>;
  onChangeJoinCode: React.ChangeEventHandler<HTMLInputElement>;
  isEntering: boolean;
  errorMessage: string;
  onChangeLeftRadio: () => void;
  onChangeRightRadio: () => void;
};

function EnteringJoinCodeDiv({
  isPlayer,
  onClickEnter,
  onChangeJoinCode,
  isEntering,
  errorMessage,
  onChangeLeftRadio,
  onChangeRightRadio,
}: EnteringJoinCodeDivProps) {
  return (
    <Div>
      <p>役割の選択</p>
      <div className="settings-radio-group">
        <label className="settings-radio-label">
          <input checked={isPlayer} onChange={onChangeLeftRadio} type="radio" />
          対戦相手
        </label>
        <label className="settings-radio-label">
          <input checked={!isPlayer} onChange={onChangeRightRadio} type="radio" />
          観戦者
        </label>
      </div>
      <p>入る部屋の参加コードを入力（8桁の半角数字）</p>
      <TextInput onChange={onChangeJoinCode} disabled={isEntering}></TextInput>
      <Button onClick={onClickEnter} disabled={isEntering}>
        この部屋に入る
      </Button>
      {errorMessage && <AnnotationText>{errorMessage}</AnnotationText>}
    </Div>
  );
}

type WaitingForHostOperationDivProps = {
  isPlayer: boolean;
  hostName: string;
  guestName?: string;
  matchPoint: string;
  thinkingTime: string;
  onFinishPreparing: () => void | Promise<void>;
  isReadyToFight: boolean;
  errorMessage: string;
};

function WaitingForHostOperationDiv({
  isPlayer,
  hostName,
  guestName = "",
  matchPoint,
  thinkingTime,
  onFinishPreparing,
  isReadyToFight,
  errorMessage,
}: WaitingForHostOperationDivProps) {
  return (
    <Div>
      <p>
        部屋のホスト： {hostName}
        <br />
        ルール： {matchPoint}点先取で勝利、選択は{thinkingTime}秒以内
      </p>
      <p>あなたの役割：{isPlayer ? "対戦相手" : "観戦者"}</p>
      {isPlayer && (
        <Button onClick={onFinishPreparing} disabled={isReadyToFight}>
          準備完了
        </Button>
      )}
      {errorMessage && <AnnotationText>{errorMessage}</AnnotationText>}
      {!isPlayer && (
        <p>
          ホストの対戦相手：{guestName === "" ? "### 入室待ち ###" : guestName}
          <br />
          試合開始までお待ち下さい
        </p>
      )}
    </Div>
  );
}

export function PrivateMatchScreen({
  matchInfo,
  onBackToTop,
  userName,
  onStartBattle,
}: PrivateMatchScreenProps) {
  const findInitialState = () => {
    if (matchInfo.roomId.length === 0) {
      return STATES.MAKE_OR_ENTER;
    } else if (isHost(matchInfo.role)) {
      return STATES.I_AM_HOST;
    } else {
      return STATES.I_AM_GUEST_OR_SPECTATOR;
    }
  };

  const [state, setState] = useState<StateId>(findInitialState());
  const [isPlayer, setIsPlayer] = useState<boolean>(isPlayerRole(matchInfo.role));
  const [matchPoint, setMatchPoint] = useState<string>(`${matchInfo.matchPoint}`);
  const [thinkingTime, setThinkingTime] = useState<string>(`${matchInfo.thinkingTimeInSec}`);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>(matchInfo.joinCode);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>(matchInfo.roomId);
  const [isBackProcessing, setIsBackProcessing] = useState<boolean>(false);
  const [hostName, setHostName] = useState<string>(matchInfo.hostName);
  const [guestName, setGuestName] = useState<string>(matchInfo.guestName);
  const [isReadyToFight, setIsReadyToFight] = useState<boolean>(false);

  function buildMatchInfo(): MatchInfo {
    let role: RolesInBattleId = ROLES_IN_BATTLE.HOST_OF_PRIVATE_MATCH;
    if (state === STATES.I_AM_HOST) {
    } else if (isPlayer) {
      role = ROLES_IN_BATTLE.GUEST_OF_PRIVATE_MATCH;
    } else {
      role = ROLES_IN_BATTLE.SPECTATOR;
    }

    return {
      roomId: roomId,
      role: role,
      hostName: hostName,
      guestName: guestName,
      matchPoint: parseInt(matchPoint),
      thinkingTimeInSec: parseInt(thinkingTime),
      joinCode: joinCode,
    };
  }

  useEffect(() => {
    const watchPrivateRoomStateArg = (st: RoomState) => {
      if (st === ROOM_STATES.CLOSED) {
        alert("部屋が削除されました");
        setRoomId("");
        setJoinCode("");
        setHostName("");
        setGuestName("");
        setIsReadyToFight(false);
        setState(STATES.MAKE_OR_ENTER);
      }
    };

    if (state === STATES.I_AM_HOST) {
      const unsubscribeGuestName = watchGuestName(roomId, (s: string) => {
        setGuestName(s ?? "");
        setIsReadyToFight(false);
      });

      const unsubscribeState = watchPrivateRoomState(roomId, watchPrivateRoomStateArg);
      return () => {
        unsubscribeGuestName();
        unsubscribeState();
      };
    } else if (state === STATES.I_AM_GUEST_OR_SPECTATOR) {
      if (isPlayer) {
        const unsubscribe = watchPrivateRoomState(roomId, watchPrivateRoomStateArg);
        return unsubscribe;
      } else {
        const unsubscribeGuestName = watchGuestName(roomId, (s: string) => {
          setGuestName(s ?? "");
        });

        const unsubscribeState = watchPrivateRoomState(roomId, watchPrivateRoomStateArg);
        return () => {
          unsubscribeGuestName();
          unsubscribeState();
        };
      }
    } else {
      return;
    }
  }, [roomId, state]);

  useEffect(() => {
    if (state !== STATES.I_AM_HOST && state !== STATES.I_AM_GUEST_OR_SPECTATOR) {
      return;
    }

    const watchPrivateRoomStateArg = (st: RoomState) => {
      if (st === ROOM_STATES.PLAYING) {
        onStartBattle(buildMatchInfo());
      }
    };

    const unsubscribe = watchPrivateRoomState(roomId, watchPrivateRoomStateArg);
    return unsubscribe;
  }, [roomId, state, isPlayer, userName, hostName, guestName, matchPoint, thinkingTime]);

  const onClickBackArrowButton = async () => {
    setIsBackProcessing(true);
    if (state === STATES.MAKE_OR_ENTER) {
      onBackToTop();
    } else if (state === STATES.MATCH_RULES_SETTING || state === STATES.ENTERING_JOIN_CODE) {
      setState(STATES.MAKE_OR_ENTER);
    } else if (state === STATES.I_AM_HOST) {
      if (!isValidPushId(roomId)) {
        alert("部屋IDに不正な値が入っています");
        setIsBackProcessing(false);
        return;
      }

      try {
        await deletePrivateRoom(roomId);
      } catch (error) {
        console.log(error);
        alert("部屋の解散に失敗しました");
        setIsBackProcessing(false);
        return;
      }
      setRoomId("");
      setHostName("");
      setGuestName("");
      setIsReadyToFight(false);
      setState(STATES.MAKE_OR_ENTER);
    } else if (state === STATES.I_AM_GUEST_OR_SPECTATOR) {
      if (!isValidPushId(roomId)) {
        alert("部屋IDに不正な値が入っています");
        setIsBackProcessing(false);
        return;
      }

      try {
        await leavePrivateRoom(isPlayer, roomId);
      } catch (error) {
        alert("退出に失敗しました");
        setIsBackProcessing(false);
        return;
      }

      setRoomId("");
      setHostName("");
      setGuestName("");
      setIsReadyToFight(false);
      setState(STATES.MAKE_OR_ENTER);
    }
    setIsBackProcessing(false);
  };

  const handleChangeMatchPoint: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextMatchPoint = event.target.value;
    setMatchPoint(nextMatchPoint);
    setErrorMessage("");
  };

  const handleChangeThinkingTime: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextMatchThinkingTime = event.target.value;
    setThinkingTime(nextMatchThinkingTime);
    setErrorMessage("");
  };

  const handleRoomCreating = async () => {
    setIsCreatingRoom(true);
    if (!isValidMatchPoint(matchPoint) || !isValidThinkingTime(thinkingTime)) {
      setErrorMessage("ルールの入力に不正な値が渡されています");
      setIsCreatingRoom(false);
      return;
    }

    try {
      const resp = await createPrivateRoom(matchPoint, thinkingTime, userName);
      const {joinCode, roomId} = resp.data;
      setJoinCode(joinCode);
      console.log(`roomId = ${roomId}`);
      setRoomId(roomId);
    } catch (error) {
      setErrorMessage("部屋の作成に失敗しました");
      setIsCreatingRoom(false);
      return;
    }

    setErrorMessage("");
    setState(STATES.I_AM_HOST);
    setHostName(userName);
    setIsCreatingRoom(false);
  };

  const handleChangeJoinCode: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextJoinCode = event.target.value;
    setJoinCode(nextJoinCode);
    setErrorMessage("");
  };

  const handleEnteringRoom = async () => {
    setIsEntering(true);
    if (!isValidJoinCode(joinCode)) {
      setErrorMessage("参加コードの入力に不正な値が渡されています");
      setIsEntering(false);
      return;
    }

    try {
      const resp = await enterPrivateRoom(joinCode, isPlayer, userName);
      const {roomId, hostName, matchPoint, thinkingTime} = resp.data;
      console.log(`roomId = ${roomId}`);
      console.log(`hostName = ${hostName}`);
      setRoomId(roomId);
      setMatchPoint(matchPoint);
      setThinkingTime(thinkingTime);
      setHostName(hostName);
    } catch (error) {
      setErrorMessage("部屋が見つかりませんでした");
      setIsEntering(false);
      return;
    }

    setErrorMessage("");
    setState(STATES.I_AM_GUEST_OR_SPECTATOR);
    if (isPlayer) {
      setGuestName(userName);
    }
    setIsEntering(false);
  };

  const handleFinishPreparing = async () => {
    if (isReadyToFight) {
      return;
    }

    setIsReadyToFight(true);
    setErrorMessage("");

    try {
      await markAsReady(roomId);
    } catch (e) {
      console.log(`e = ${e}`);
      setIsReadyToFight(false);
      setErrorMessage("準備完了通知に失敗しました");
    }
  };

  return (
    <main className="screen not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.PRIVATE_MATCH} />
      <BackArrowButton
        onClick={onClickBackArrowButton}
        disabled={isBackProcessing || isCreatingRoom || isEntering || isReadyToFight}
      />
      {state === STATES.MAKE_OR_ENTER && (
        <MakeOrEnterDiv
          onClickMake={() => setState(STATES.MATCH_RULES_SETTING)}
          onClickEnter={() => setState(STATES.ENTERING_JOIN_CODE)}
        />
      )}
      {state === STATES.MATCH_RULES_SETTING && (
        <MatchRulesSettingDiv
          onChangeMatchPoint={handleChangeMatchPoint}
          onChangeThinkingTime={handleChangeThinkingTime}
          onRoomCreating={handleRoomCreating}
          matchPoint={matchPoint}
          thinkingTime={thinkingTime}
          isCreatingRoom={isCreatingRoom}
          errorMessage={errorMessage}
        />
      )}
      {state === STATES.I_AM_HOST && (
        <WaitingForGuestDiv
          roomId={roomId}
          joinCode={joinCode}
          matchPoint={matchPoint}
          thinkingTime={thinkingTime}
          guestName={guestName}
          onFinishPreparing={handleFinishPreparing}
          isReadyToFight={isReadyToFight}
          errorMessage={errorMessage}
        />
      )}
      {state === STATES.ENTERING_JOIN_CODE && (
        <EnteringJoinCodeDiv
          isPlayer={isPlayer}
          onClickEnter={handleEnteringRoom}
          onChangeJoinCode={handleChangeJoinCode}
          isEntering={isEntering}
          errorMessage={errorMessage}
          onChangeLeftRadio={() => setIsPlayer(true)}
          onChangeRightRadio={() => setIsPlayer(false)}
        ></EnteringJoinCodeDiv>
      )}
      {state === STATES.I_AM_GUEST_OR_SPECTATOR && (
        <WaitingForHostOperationDiv
          isPlayer={isPlayer}
          hostName={hostName}
          guestName={guestName}
          matchPoint={matchPoint}
          thinkingTime={thinkingTime}
          onFinishPreparing={handleFinishPreparing}
          isReadyToFight={isReadyToFight}
          errorMessage={errorMessage}
        ></WaitingForHostOperationDiv>
      )}
    </main>
  );
}
