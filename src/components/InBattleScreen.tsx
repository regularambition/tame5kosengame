import "./InBattleScreen.css";
import spectatorIcon from "../assets/ui/spectatorCount.png";

import {useState, useEffect, ReactNode, useRef, useCallback} from "react";

import {Button} from "./ui/Button";
import {HANDS} from "../constants/hands";

import {
  isValidPushId,
  GamePhase,
  GAME_PHASES,
  DURATION_IN_MILLI_SEC,
  HandId,
  HAND_IDS,
  INITIAL_VALUES_IN_BATTLE,
  WinnerDetectionResultId,
  WINNER_DETECTION_RESULT,
  canSelectHand,
  ROOM_STATES,
  CheaterDetectionResultId,
  CHEATER_DETECTION_RESULT,
  ResignerDetectionResultId,
  RESIGNER_DETECTION_RESULT,
} from "@tame5kosengame/shared";

import {CenterAligningDiv} from "./ui/CenterAligningDiv";
import {ResignButton} from "./ui/ResignButton";
import {IconButton} from "./ui/IconButton";
import {ButtonRow} from "./ui/ButtonRow";
import {watchGamePhase} from "../api/inBattle/watchGamePhase";
import {useServerClock} from "../contexts/ServerClockContext";
import {watchHandSubmissionDeadline} from "../api/inBattle/watchHandSubmissionDeadline";
import {submitHand} from "../api/inBattle/submitHand";
import {watchNextPhaseAt} from "../api/inBattle/watchNextPhaseAt";
import {watchCurrentRoundNumber} from "../api/inBattle/watchCurrentRoundNumber";
import {
  isGuest,
  isHost,
  isPlayerRole,
  isPrivateMatch,
  isSpectator,
  RolesInBattleId,
} from "../constants/rolesInBattle";
import {
  HAND_SUBMISSION_RETRY_INTERVAL_MS,
  MINIMUM_REQUEST_MARGIN_MS,
  REMAINING_INTERLUDE_TIME_RENDER_INTERVAL_MS,
} from "../constants/durationInBattle";
import {watchFinalWinnerOfMatch} from "../api/inBattle/watchFinalWinnerOfMatch";
import {watchHostMana} from "../api/inBattle/watchHostMana";
import {watchHostScore} from "../api/inBattle/watchHostScore";
import {watchGuestMana} from "../api/inBattle/watchGuestMana";
import {watchGuestScore} from "../api/inBattle/watchGuestScore";
import {watchSpectatorCount} from "../api/inBattle/watchSpectatorCount";
import {watchResolvedHostHand} from "../api/inBattle/watchResolvedHostHand";
import {watchResolvedGuestHand} from "../api/inBattle/watchResolvedGuestHand";
import {AnnotationText} from "./ui/AnnotationText";
import {Unsubscribe} from "firebase/database";
import {watchBackToLobbyAt} from "../api/inBattle/watchBackToLobbyAt";
import {watchPrivateRoomState} from "../api/watchPrivateRoom";
import {MatchInfo} from "../types/MatchInfo";
import {watchCheater} from "../api/inBattle/watchCheater";
import {watchResigner} from "../api/inBattle/watchResigner";
import {resign} from "../api/inBattle/resign";
import {BackArrowButton} from "./ui/BackArrowButton";
import {leavePrivateRoom} from "../api/leavePrivateRoom";

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
  isDownside: boolean;
  role: RolesInBattleId;
  score: number;
  mana: number;
};
function PlayerStatusDiv({
  userName,
  className = "",
  isDownside,
  role,
  score,
  mana,
}: PlayerStatusDivProps) {
  return (
    <CenterAligningDiv>
      <table className={className}>
        <tbody>
          <tr>
            <td>{score}点</td>
            <td>
              {userName}
              {isDownside && (isPlayerRole(role) ? "(You)" : "(Host)")}
              {!isDownside && isSpectator(role) && "(Guest)"}
            </td>
            <td>{mana}マナ</td>
          </tr>
        </tbody>
      </table>
    </CenterAligningDiv>
  );
}

type SpectatorUiDivProps = {
  spectatorCount: number;
};
function SpectatorUiDiv({spectatorCount}: SpectatorUiDivProps) {
  return (
    <CenterAligningDiv className="spectator-ui">
      <img className="icon-spectator" src={spectatorIcon} />
      <span>{spectatorCount}</span>
    </CenterAligningDiv>
  );
}

function toRemainingTimeInSec(remainingMs: number): number {
  const res = Math.ceil(remainingMs * 0.001);
  return res;
}

function renderRemainingInterludeTime(
  matchInfo: MatchInfo,
  monitorFunction: (
    roomId: string,
    onChange: (backToLobbyAt: number) => void,
    isPrivateMatch: boolean,
  ) => Unsubscribe,
) {
  const {isReady, now} = useServerClock();

  const [nextPhaseAt, setNextPhaseAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    return monitorFunction(matchInfo.roomId, setNextPhaseAt, isPrivateMatch(matchInfo.role));
  }, []);

  useEffect(() => {
    if (!isReady || nextPhaseAt === null) {
      setRemainingMs(null);
      return;
    }

    let timeoutId: number | undefined;
    let disposed = false;

    const updateRemainingMs = async () => {
      if (disposed) {
        return;
      }

      const nextRemainingMs = Math.max(0, nextPhaseAt - now());
      setRemainingMs(nextRemainingMs);

      const scheduleNext = (delayMs: number) => {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(updateRemainingMs, delayMs);
      };

      if (nextRemainingMs > 0) {
        scheduleNext(Math.min(nextRemainingMs, REMAINING_INTERLUDE_TIME_RENDER_INTERVAL_MS));
        return;
      }
    };

    void updateRemainingMs();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void updateRemainingMs();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isReady, now, nextPhaseAt]);

  return remainingMs;
}

type IntroPhaseDivProps = {matchInfo: MatchInfo};
function IntroPhaseDiv({matchInfo}: IntroPhaseDivProps) {
  const {matchPoint, thinkingTimeInSec} = matchInfo;

  const remainingMs = renderRemainingInterludeTime(matchInfo, watchNextPhaseAt);
  const remainingTimeInSec = remainingMs === null ? null : toRemainingTimeInSec(remainingMs);

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
      {remainingTimeInSec === null && <p>開始までの時間を取得中</p>}
      {remainingTimeInSec !== null && <p>{remainingTimeInSec}秒後にゲーム開始</p>}
    </MainDiv>
  );
}

type CardButtonProps = {
  src: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};
function CardButton({src, label, selected = false, disabled = false, onClick}: CardButtonProps) {
  return (
    <IconButton
      className="card-button"
      iconSrc={src}
      label={label}
      onClick={onClick}
      disabled={disabled}
      data-selected={selected ? "true" : undefined}
      aria-pressed={selected}
    />
  );
}

type UseScheduledHandSubmissionArgs = {
  deadline: number | null;
  selectedHand: HandId;
  roundNumber: number;
  onComingTime: (hand: HandId, roundId: number) => Promise<void>;
};
export function useScheduledHandSubmission({
  deadline,
  selectedHand,
  roundNumber,
  onComingTime,
}: UseScheduledHandSubmissionArgs) {
  const {isReady, now} = useServerClock();

  const selectedHandRef = useRef(selectedHand);
  const onComingTimeRef = useRef(onComingTime);
  const submittedRoundRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);

  // nullはdeadlineまたは時刻情報の読み込み中を表す
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    selectedHandRef.current = selectedHand;
  }, [selectedHand]);

  useEffect(() => {
    onComingTimeRef.current = onComingTime;
  }, [onComingTime]);

  useEffect(() => {
    if (!isReady || deadline === null) {
      setRemainingMs(null);
      return;
    }

    const submissionTime = deadline - DURATION_IN_MILLI_SEC.HAND_SUBMISSION_DEADLINE_BUFFER;

    let timeoutId: number | undefined;
    let disposed = false;

    const trySubmit = async () => {
      if (disposed) {
        // console.log("手の提出処理が始まったので古い予約は無効化されたのだ");
        return;
      }

      const nextRemainingMs = Math.max(0, submissionTime - now());

      // stateを更新することで画面を再レンダーする
      setRemainingMs(nextRemainingMs);

      if (submittedRoundRef.current === roundNumber) {
        // console.log("このラウンドはもう手を提出済みなのだ");
        return;
      }

      const scheduleNext = (delayMs: number) => {
        if (timeoutId !== undefined) {
          // console.log("二重タイマー防止のため古い予約を消したのだ");
          window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(trySubmit, delayMs);
      };

      if (nextRemainingMs > 0) {
        // console.log("まだ提出時刻が来てないので実行を予約するのだ");
        scheduleNext(Math.min(nextRemainingMs, HAND_SUBMISSION_RETRY_INTERVAL_MS));
        return;
      }

      if (isSubmittingRef.current) {
        // console.log("手の提出処理中なのだ");
        return;
      }

      isSubmittingRef.current = true;

      try {
        await onComingTimeRef.current(selectedHandRef.current, roundNumber);
        submittedRoundRef.current = roundNumber;
      } catch (error) {
        console.error("手の提出に失敗しました。", error);

        if (disposed) {
          // console.log("手の提出処理が始まったので古い予約は無効化されたのだ（catchブロック）");
          return;
        }

        // deadlineはバッファを含む最終受理期限
        const remainingUntilDeadlineMs = deadline - now();

        if (remainingUntilDeadlineMs <= MINIMUM_REQUEST_MARGIN_MS) {
          console.error("手の提出期限が迫っているため、再試行を終了します。");
          return;
        }

        const retryDelayMs = Math.min(HAND_SUBMISSION_RETRY_INTERVAL_MS, remainingUntilDeadlineMs);

        // console.log(`${retryDelayMs}ms後に手の提出を再試行します。`);

        scheduleNext(retryDelayMs);
      } finally {
        isSubmittingRef.current = false;
      }
    };

    void trySubmit();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void trySubmit();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [deadline, isReady, now, roundNumber]);

  return remainingMs;
}

const HAND_BY_KEY_CODE: Partial<Record<string, HandId>> = {
  KeyA: HAND_IDS.CHARGE,
  KeyS: HAND_IDS.DEFENSE,
  KeyK: HAND_IDS.ATTACK,
  KeyL: HAND_IDS.BEAM,
};

type SelectingPhaseDivProps = {
  matchInfo: MatchInfo;
  roundNumber: number;
  mana: number;
};
function SelectingPhaseDiv({matchInfo, roundNumber, mana}: SelectingPhaseDivProps) {
  const [selectedHand, setSelectedHand] = useState<HandId>(HAND_IDS.CHARGE);
  const [handSubmissionDeadline, setHandSubmissionDeadline] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = watchHandSubmissionDeadline(
      matchInfo.roomId,
      (deadline: number) => {
        setHandSubmissionDeadline(deadline);
      },
      true,
    );
    return unsubscribe;
  }, []);

  const args: UseScheduledHandSubmissionArgs = {
    deadline: handSubmissionDeadline,
    selectedHand: selectedHand,
    roundNumber: roundNumber,
    onComingTime: async (hand) => {
      if (isSpectator(matchInfo.role)) {
        return;
      }

      if (!isValidPushId(matchInfo.roomId)) {
        throw new Error();
      }
      await submitHand(matchInfo.roomId, hand, roundNumber, mana);
    },
  };

  const remainingMs = useScheduledHandSubmission(args);
  const remainingSeconds = remainingMs === null ? null : toRemainingTimeInSec(remainingMs);

  const [errorMsg, setErrorMsg] = useState<string>("");

  const selectHandIfAble = useCallback(
    (hand: HandId) => {
      if (canSelectHand(hand, mana)) {
        setErrorMsg("");
        setSelectedHand(hand);
      } else {
        setErrorMsg("マナが不足しています");
      }
    },
    [mana],
  );

  useEffect(() => {
    if (!isPlayerRole(matchInfo.role)) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // キー長押しによる連続入力を無視
      if (event.repeat) {
        return;
      }

      // Ctrl+Aなどのショートカットには反応しない
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // 入力欄へ文字を入力しているときは反応しない
      const target = event.target;
      if (target instanceof HTMLElement) {
        const isTextInput =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable;

        if (isTextInput) {
          return;
        }
      }

      const hand = HAND_BY_KEY_CODE[event.code];
      if (hand === undefined) {
        return;
      }

      event.preventDefault();
      selectHandIfAble(hand);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [matchInfo.role, selectHandIfAble]);

  return (
    <MainDiv>
      <p>{remainingSeconds === null ? "残り時間を取得中..." : `残り${remainingSeconds}秒`}</p>
      {isPlayerRole(matchInfo.role) && (
        <div className="card-container">
          <CardButton
            src={HANDS.CHARGE.imageSrc}
            label={HANDS.CHARGE.label}
            selected={selectedHand === HAND_IDS.CHARGE}
            onClick={() => selectHandIfAble(HAND_IDS.CHARGE)}
          />
          <CardButton
            src={HANDS.DEFENSE.imageSrc}
            label={HANDS.DEFENSE.label}
            selected={selectedHand === HAND_IDS.DEFENSE}
            onClick={() => selectHandIfAble(HAND_IDS.DEFENSE)}
          />
          <CardButton
            src={HANDS.ATTACK.imageSrc}
            label={HANDS.ATTACK.label}
            selected={selectedHand === HAND_IDS.ATTACK}
            onClick={() => selectHandIfAble(HAND_IDS.ATTACK)}
          />
          <CardButton
            src={HANDS.BEAM.imageSrc}
            label={HANDS.BEAM.label}
            selected={selectedHand === HAND_IDS.BEAM}
            onClick={() => selectHandIfAble(HAND_IDS.BEAM)}
          />
        </div>
      )}
      {errorMsg.length > 0 && <AnnotationText>{errorMsg}</AnnotationText>}
      {isSpectator(matchInfo.role) && <p>選択が揃うまでお待ち下さい</p>}
    </MainDiv>
  );
}

type ChoiceIconProps = {
  src: string;
};
function ChoiceIcon({src}: ChoiceIconProps) {
  return <img className="card-button" src={src} alt="" />;
}

type ResolvedPhaseDivProps = {
  matchInfo: MatchInfo;
  isDownsideGuest: boolean;
};
function ResolvedPhaseDiv({matchInfo, isDownsideGuest}: ResolvedPhaseDivProps) {
  const remainingMs = renderRemainingInterludeTime(matchInfo, watchNextPhaseAt);
  const remainingTimeInSec = remainingMs === null ? null : toRemainingTimeInSec(remainingMs);

  const displayedStr =
    "このラウンドの結果反映まで残り" +
    (remainingTimeInSec === null ? "（取得中）" : `${remainingTimeInSec}秒`);

  const toImageSource = (hand: HandId) => {
    if (hand === HAND_IDS.CHARGE) {
      return HANDS.CHARGE.imageSrc;
    } else if (hand === HAND_IDS.DEFENSE) {
      return HANDS.DEFENSE.imageSrc;
    } else if (hand === HAND_IDS.ATTACK) {
      return HANDS.ATTACK.imageSrc;
    } else {
      return HANDS.BEAM.imageSrc;
    }
  };

  const [resolvedHostHand, setResolvedHostHand] = useState<HandId>(HAND_IDS.CHARGE);
  const [resolvedGuestHand, setResolvedGuestHand] = useState<HandId>(HAND_IDS.CHARGE);

  useEffect(() => {
    return watchResolvedHostHand(
      matchInfo.roomId,
      setResolvedHostHand,
      isPrivateMatch(matchInfo.role),
    );
  }, []);

  useEffect(() => {
    return watchResolvedGuestHand(
      matchInfo.roomId,
      setResolvedGuestHand,
      isPrivateMatch(matchInfo.role),
    );
  }, []);

  return (
    <MainDiv isVerticalEven={true}>
      <ChoiceIcon src={toImageSource(isDownsideGuest ? resolvedHostHand : resolvedGuestHand)} />
      <p>{displayedStr}</p>
      <ChoiceIcon src={toImageSource(isDownsideGuest ? resolvedGuestHand : resolvedHostHand)} />
    </MainDiv>
  );
}

type FinishedPhaseDivProps = {
  matchInfo: MatchInfo;
  leftScore: number;
  rightScore: number;
  onBackToPrivateLobby: () => void;
};
function FinishedPhaseDiv({
  matchInfo,
  leftScore,
  rightScore,
  onBackToPrivateLobby,
}: FinishedPhaseDivProps) {
  const [finalWinnerOfMatch, setFinalWinnerOfMatch] = useState<WinnerDetectionResultId>(
    WINNER_DETECTION_RESULT.DRAW,
  );

  useEffect(() => {
    return watchFinalWinnerOfMatch(
      matchInfo.roomId,
      setFinalWinnerOfMatch,
      isPrivateMatch(matchInfo.role),
    );
  }, []);

  const [cheater, setCheater] = useState<CheaterDetectionResultId | undefined>(undefined);

  useEffect(() => {
    return watchCheater(matchInfo.roomId, setCheater, isPrivateMatch(matchInfo.role));
  }, []);

  const [resigner, setResginer] = useState<ResignerDetectionResultId | undefined>(undefined);

  useEffect(() => {
    return watchResigner(matchInfo.roomId, setResginer, isPrivateMatch(matchInfo.role));
  }, []);

  if (isPrivateMatch(matchInfo.role)) {
    useEffect(() => {
      return watchPrivateRoomState(matchInfo.roomId, (st) => {
        if (st === ROOM_STATES.PREPARING) {
          onBackToPrivateLobby();
        }
      });
    }, []);
  }

  const remainingMs = isPrivateMatch(matchInfo.role)
    ? renderRemainingInterludeTime(matchInfo, watchBackToLobbyAt)
    : 0;
  const remainingTimeInSec = remainingMs === null ? null : toRemainingTimeInSec(remainingMs);

  const findResultUserForUi = (
    matchInfo: MatchInfo,
    comparedStateValue:
      WinnerDetectionResultId | CheaterDetectionResultId | ResignerDetectionResultId | undefined,
    hostSideConstant:
      WinnerDetectionResultId | CheaterDetectionResultId | ResignerDetectionResultId,
  ) => {
    let res = "";
    if (comparedStateValue === hostSideConstant) {
      if (isHost(matchInfo.role)) {
        res += "あなた";
      } else if (isGuest(matchInfo.role)) {
        res += "対戦相手";
      } else {
        res += "ホスト";
      }
    } else if (isGuest(matchInfo.role)) {
      res += "あなた";
    } else if (isHost(matchInfo.role)) {
      res += "対戦相手";
    } else {
      res += "ゲスト";
    }

    return res;
  };

  return (
    <MainDiv isVerticalEven={true}>
      <p className="final-score">
        {leftScore} - {rightScore}
      </p>
      <p className="result-description">
        結果：{findResultUserForUi(matchInfo, finalWinnerOfMatch, WINNER_DETECTION_RESULT.HOST_WON)}
        の勝利
      </p>
      {cheater !== undefined && (
        <AnnotationText>
          {findResultUserForUi(matchInfo, cheater, CHEATER_DETECTION_RESULT.HOST_USED_CHEATING)}
          がチートを使用しました
        </AnnotationText>
      )}
      {resigner !== undefined && (
        <AnnotationText>
          {findResultUserForUi(matchInfo, resigner, RESIGNER_DETECTION_RESULT.HOST_RESIGNED)}
          が降参しました
        </AnnotationText>
      )}
      {isPrivateMatch(matchInfo.role) && (
        <p>
          {remainingTimeInSec === null
            ? "ロビー帰還までの時間を取得中"
            : `${remainingTimeInSec}秒後にロビーへ戻ります`}
        </p>
      )}
      {!isPrivateMatch(matchInfo.role) && (
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
  onBackToPrivateLobby: () => void;
  onLeaveAsSpectator: () => void;
  privateRoomConnectionId: string;
};
export function InBattleScreen({
  matchInfo,
  onBackToPrivateLobby,
  onLeaveAsSpectator,
}: InBattleScreenProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GAME_PHASES.INTRO);
  const [roundNumber, setRoundNumber] = useState<number>(INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER);

  useEffect(() => {
    return watchGamePhase(matchInfo.roomId, setGamePhase, isPrivateMatch(matchInfo.role));
  }, [matchInfo.roomId]);

  useEffect(() => {
    return watchCurrentRoundNumber(
      matchInfo.roomId,
      setRoundNumber,
      isPrivateMatch(matchInfo.role),
    );
  }, [matchInfo.roomId]);

  const [hostMana, setHostMana] = useState<number>(INITIAL_VALUES_IN_BATTLE.MANA);
  const [hostScore, setHostScore] = useState<number>(INITIAL_VALUES_IN_BATTLE.SCORE);
  const [guestMana, setGuestMana] = useState<number>(INITIAL_VALUES_IN_BATTLE.MANA);
  const [guestScore, setGuestScore] = useState<number>(INITIAL_VALUES_IN_BATTLE.SCORE);

  useEffect(() => {
    return watchHostMana(matchInfo.roomId, setHostMana, isPrivateMatch(matchInfo.role));
  }, []);

  useEffect(() => {
    return watchHostScore(matchInfo.roomId, setHostScore, isPrivateMatch(matchInfo.role));
  }, []);

  useEffect(() => {
    return watchGuestMana(matchInfo.roomId, setGuestMana, isPrivateMatch(matchInfo.role));
  }, []);

  useEffect(() => {
    return watchGuestScore(matchInfo.roomId, setGuestScore, isPrivateMatch(matchInfo.role));
  }, []);

  const [spectatorCount, setSpectatorCount] = useState<number>(0);

  useEffect(() => {
    if (!isPrivateMatch(matchInfo.role)) {
      return;
    }

    return watchSpectatorCount(matchInfo.roomId, setSpectatorCount);
  }, [matchInfo]);

  const isDownsideGuest = isGuest(matchInfo.role);
  const canResign =
    isPlayerRole(matchInfo.role) &&
    (gamePhase === GAME_PHASES.SELECTING || gamePhase === GAME_PHASES.RESOLVED);
  const [isResigning, setIsResigning] = useState<boolean>(false);

  const handleResign = async () => {
    if (!canResign) {
      alert("観戦者は降参できません");
      return;
    }

    setIsResigning(true);
    await resign(matchInfo.roomId, isPrivateMatch(matchInfo.role));
    setIsResigning(false);
  };

  const [isLeavingAsSpectator, setIsLeavingAsSpectator] = useState<boolean>(false);

  const handleLeaveAsSpectator = async () => {
    if (isPlayerRole(matchInfo.role)) {
      alert("観戦者が退出する用のボタンです");
      return;
    }

    setIsLeavingAsSpectator(true);
    await leavePrivateRoom(false, matchInfo.roomId);
    setIsLeavingAsSpectator(false);
    // matchInfoを初期状態に戻してプライベートマッチ選択画面へ戻る
    onLeaveAsSpectator();
  };

  return (
    <main className="screen not-playing-text-general using-full-height vertical-alignment vertical-even">
      {isPrivateMatch(matchInfo.role) && <SpectatorUiDiv spectatorCount={spectatorCount} />}
      {canResign && (
        <ResignButton disabled={isResigning} onClick={async () => await handleResign()} />
      )}
      {isSpectator(matchInfo.role) && (
        <BackArrowButton
          disabled={isLeavingAsSpectator}
          onClick={async () => await handleLeaveAsSpectator()}
        />
      )}
      <PlayerStatusDiv
        userName={isDownsideGuest ? matchInfo.hostName : matchInfo.guestName}
        className="panel-p2"
        isDownside={false}
        role={matchInfo.role}
        score={isDownsideGuest ? hostScore : guestScore}
        mana={isDownsideGuest ? hostMana : guestMana}
      />
      {gamePhase === GAME_PHASES.INTRO && <IntroPhaseDiv matchInfo={matchInfo} />}
      {gamePhase === GAME_PHASES.SELECTING && (
        <SelectingPhaseDiv
          matchInfo={matchInfo}
          roundNumber={roundNumber}
          mana={isGuest(matchInfo.role) ? guestMana : hostMana}
        />
      )}
      {gamePhase === GAME_PHASES.RESOLVED && (
        <ResolvedPhaseDiv matchInfo={matchInfo} isDownsideGuest={isDownsideGuest} />
      )}
      {gamePhase === GAME_PHASES.FINISHED && (
        <FinishedPhaseDiv
          matchInfo={matchInfo}
          leftScore={isDownsideGuest ? guestScore : hostScore}
          rightScore={isDownsideGuest ? hostScore : guestScore}
          onBackToPrivateLobby={onBackToPrivateLobby}
        />
      )}
      <PlayerStatusDiv
        userName={isDownsideGuest ? matchInfo.guestName : matchInfo.hostName}
        className="panel-p1"
        isDownside={true}
        role={matchInfo.role}
        score={isDownsideGuest ? guestScore : hostScore}
        mana={isDownsideGuest ? guestMana : hostMana}
      />
    </main>
  );
}
