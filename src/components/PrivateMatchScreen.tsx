import {useState} from "react";

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

import {isValidMatchPoint, isValidThinkingTime, VALID_NUMBER_RANGE} from "@tame5kosengame/shared";

type PrivateMatchScreenProps = {
  gameSettings: GameSettings;
  onBackToTop: () => void;
};

const STATES = {
  MAKE_OR_ENTER: 0,
  MATCH_RULES_SETTING: 1,
  WAITING_FOR_GUEST: 2,
  ENTERING_ROOM_ID: 3,
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
        対戦相手や観戦者に部屋IDを連携してください
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
  roomId: string;
  matchPoint: string;
  thinkingTime: string;
};

function WaitingForGuestDiv({roomId, matchPoint, thinkingTime}: WaitingForGuestDivProps) {
  return (
    <Div>
      <p>
        部屋のID：
        <br />
        {roomId}
      </p>
      <Button onClick={() => {}} type="button">
        部屋IDをコピー
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

type EnteringRoomIdDivProps = {
  isPlayer: boolean;
  onClickEnter: () => void;
};

function EnteringRoomIdDiv({isPlayer, onClickEnter}: EnteringRoomIdDivProps) {
  return (
    <Div>
      <p>役割の選択</p>
      <div className="settings-radio-group">
        <label className="settings-radio-label">
          <input
            checked={isPlayer}
            // onChange={() => handleChangeHighlightHand(true)}
            type="radio"
          />
          対戦相手
        </label>
        <label className="settings-radio-label">
          <input
            checked={!isPlayer}
            // onChange={() => handleChangeHighlightHand(false)}
            type="radio"
          />
          観戦者
        </label>
      </div>
      <p>入る部屋のIDを入力</p>
      <TextInput></TextInput>
      <Button onClick={onClickEnter} type="button">
        この部屋に入る
      </Button>
    </Div>
  );
}

type WaitingForHostOperationDivProps = {
  isPlayer: boolean;
};

function WaitingForHostOperationDiv({isPlayer}: WaitingForHostOperationDivProps) {
  return (
    <Div>
      <p>
        ルール：
        <br />
        {5}点先取で勝利、選択は{5}秒以内
      </p>
      <p>
        あなたの役割：{isPlayer ? "対戦相手" : "観戦者"}
        <br />
        ホストの操作をお待ちください
      </p>
    </Div>
  );
}

export function PrivateMatchScreen({gameSettings, onBackToTop}: PrivateMatchScreenProps) {
  const [state, setState] = useState<StateId>(STATES.MAKE_OR_ENTER);
  const [isPlayer, setIsPlayer] = useState<boolean>(true);
  const [matchPoint, setMatchPoint] = useState<string>(`${DEFAULT_MATCH_RULES.matchPoint}`);
  const [thinkingTime, setThinkingTime] = useState<string>(
    `${DEFAULT_MATCH_RULES.thinkingTimeInSec}`,
  );
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const onClickBackArrowButton = () => {
    if (state === STATES.MAKE_OR_ENTER) {
      onBackToTop();
    } else if (state === STATES.MATCH_RULES_SETTING || state === STATES.ENTERING_ROOM_ID) {
      setState(STATES.MAKE_OR_ENTER);
    } else if (state === STATES.WAITING_FOR_GUEST) {
      setState(STATES.MAKE_OR_ENTER);
    } else if (state === STATES.WAITING_FOR_HOST_OPERATION) {
      setState(STATES.MAKE_OR_ENTER);
    }
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
      const resp = await createPrivateRoom(matchPoint, thinkingTime);
      setRoomId(resp.data.roomId);
    } catch (error) {
      setErrorMessage("部屋の作成に失敗しました");
      setIsCreatingRoom(false);
      return;
    }

    setErrorMessage("");
    setState(STATES.WAITING_FOR_GUEST);
    setIsCreatingRoom(false);
  };

  return (
    <main className="screen not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.PRIVATE_MATCH} />
      <BackArrowButton onClick={onClickBackArrowButton} />
      {state === STATES.MAKE_OR_ENTER && (
        <MakeOrEnterDiv
          onClickMake={() => setState(STATES.MATCH_RULES_SETTING)}
          onClickEnter={() => setState(STATES.ENTERING_ROOM_ID)}
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
        <WaitingForGuestDiv roomId={roomId} matchPoint={matchPoint} thinkingTime={thinkingTime} />
      )}
      {state === STATES.ENTERING_ROOM_ID && (
        <EnteringRoomIdDiv
          isPlayer={isPlayer}
          onClickEnter={() => setState(STATES.WAITING_FOR_HOST_OPERATION)}
        ></EnteringRoomIdDiv>
      )}
      {state === STATES.WAITING_FOR_HOST_OPERATION && (
        <WaitingForHostOperationDiv isPlayer={isPlayer}></WaitingForHostOperationDiv>
      )}
    </main>
  );
}
