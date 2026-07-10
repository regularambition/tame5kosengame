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
import {watchPrivateRoomDeleted} from "../api/watchPrivateRoom";

import {
  isValidJoinCode,
  isValidMatchPoint,
  isValidThinkingTime,
  VALID_NUMBER_RANGE,
  isValidPushId,
} from "@tame5kosengame/shared";

type PrivateMatchScreenProps = {
  gameSettings: GameSettings;
  onBackToTop: () => void;
  userName: string;
};

const STATES = {
  MAKE_OR_ENTER: 0,
  MATCH_RULES_SETTING: 1,
  WAITING_FOR_GUEST: 2,
  ENTERING_JOIN_CODE: 3,
  WAITING_FOR_HOST_OPERATION: 4,
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
        <Button onClick={onClickMake} type="button">
          部屋を建てる
        </Button>
        <Button onClick={onClickEnter} type="button">
          部屋に入る
        </Button>
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
      <Button onClick={onRoomCreating} type="button" disabled={isCreatingRoom}>
        この条件で建てる
      </Button>
      {errorMessage && <AnnotationText>{errorMessage}</AnnotationText>}
    </Div>
  );
}

type WaitingForGuestDivProps = {
  joinCode: string;
  matchPoint: string;
  thinkingTime: string;
};

function WaitingForGuestDiv({joinCode, matchPoint, thinkingTime}: WaitingForGuestDivProps) {
  return (
    <Div>
      <p>
        参加コード：
        <br />
        {joinCode}
      </p>
      <Button onClick={() => {}} type="button">
        参加コードをコピー
      </Button>
      <p>
        ルール：
        <br />
        {matchPoint}点先取で勝利、選択は{thinkingTime}秒以内
      </p>
      <p>相手の名前：taisennaitenonamae</p>
      <Button onClick={() => {}} type="button">
        試合開始
      </Button>
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
      <Button onClick={onClickEnter} type="button" disabled={isEntering}>
        この部屋に入る
      </Button>
      {errorMessage && <AnnotationText>{errorMessage}</AnnotationText>}
    </Div>
  );
}

type WaitingForHostOperationDivProps = {
  isPlayer: boolean;
  hostName: string;
  matchPoint: string;
  thinkingTime: string;
  onFinishPreparing: () => void;
  isReadyToFight: boolean;
};

function WaitingForHostOperationDiv({
  isPlayer,
  hostName,
  matchPoint,
  thinkingTime,
  onFinishPreparing,
  isReadyToFight,
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
        <Button onClick={onFinishPreparing} type="button" disabled={isReadyToFight}>
          準備完了
        </Button>
      )}
      {!isPlayer && <p>試合開始までお待ち下さい</p>}
    </Div>
  );
}

export function PrivateMatchScreen({gameSettings, onBackToTop, userName}: PrivateMatchScreenProps) {
  const [state, setState] = useState<StateId>(STATES.MAKE_OR_ENTER);
  const [isPlayer, setIsPlayer] = useState<boolean>(true);
  const [matchPoint, setMatchPoint] = useState<string>(`${DEFAULT_MATCH_RULES.matchPoint}`);
  const [thinkingTime, setThinkingTime] = useState<string>(
    `${DEFAULT_MATCH_RULES.thinkingTimeInSec}`,
  );
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>("");
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [isBackProcessing, setIsBackProcessing] = useState<boolean>(false);
  const [opponentOrHostName, setOpponentOrHostName] = useState<string>("");
  const [isReadyToFight, setIsReadyToFight] = useState<boolean>(false);

  useEffect(() => {
    if (!roomId || state !== STATES.WAITING_FOR_HOST_OPERATION) {
      return;
    }

    const unsubscribe = watchPrivateRoomDeleted(roomId, () => {
      alert("部屋が削除されました");
      setRoomId("");
      setJoinCode("");
      setOpponentOrHostName("");
      setIsReadyToFight(false);
      setState(STATES.MAKE_OR_ENTER);
    });

    return unsubscribe;
  }, [roomId, state]);

  const onClickBackArrowButton = async () => {
    setIsBackProcessing(true);
    if (state === STATES.MAKE_OR_ENTER) {
      onBackToTop();
    } else if (state === STATES.MATCH_RULES_SETTING || state === STATES.ENTERING_JOIN_CODE) {
      setState(STATES.MAKE_OR_ENTER);
    } else if (state === STATES.WAITING_FOR_GUEST) {
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
      setOpponentOrHostName("");
      setIsReadyToFight(false);
      setState(STATES.MAKE_OR_ENTER);
    } else if (state === STATES.WAITING_FOR_HOST_OPERATION) {
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
      setOpponentOrHostName("");
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
    setState(STATES.WAITING_FOR_GUEST);
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
      setOpponentOrHostName(hostName);
    } catch (error) {
      setErrorMessage("部屋が見つかりませんでした");
      setIsEntering(false);
      return;
    }

    setErrorMessage("");
    setState(STATES.WAITING_FOR_HOST_OPERATION);
    setIsEntering(false);
  };

  return (
    <main className="screen not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.PRIVATE_MATCH} />
      <BackArrowButton
        onClick={onClickBackArrowButton}
        disabled={isBackProcessing || isCreatingRoom || isEntering}
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
      {state === STATES.WAITING_FOR_GUEST && (
        <WaitingForGuestDiv
          joinCode={joinCode}
          matchPoint={matchPoint}
          thinkingTime={thinkingTime}
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
      {state === STATES.WAITING_FOR_HOST_OPERATION && (
        <WaitingForHostOperationDiv
          isPlayer={isPlayer}
          hostName={opponentOrHostName}
          matchPoint={matchPoint}
          thinkingTime={thinkingTime}
          onFinishPreparing={() => setIsReadyToFight(true)}
          isReadyToFight={isReadyToFight}
        ></WaitingForHostOperationDiv>
      )}
    </main>
  );
}
