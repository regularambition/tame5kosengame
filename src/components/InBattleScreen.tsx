import "./InBattleScreen.css";
import spectatorIcon from "../assets/ui/spectatorCount.png";

import {useState, useEffect, ReactNode, useRef} from "react";

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
} from "@tame5kosengame/shared";

import {MatchInfo} from "../App";
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
  // score: number;
  // mana: number;
};
function PlayerStatusDiv({
  userName,
  className = "",
  isPlayer1,
  iAmPlayer = true,
  // score,
  // mana,
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

function toRemainingTimeInSec(remainingMs: number): number {
  const res = Math.ceil(remainingMs * 0.001);
  return res;
}

type IntroPhaseDivProps = {matchInfo: MatchInfo};
function IntroPhaseDiv({matchInfo}: IntroPhaseDivProps) {
  const {matchPoint, thinkingTimeInSec} = matchInfo;
  const {isReady, now} = useServerClock();

  const [remainingTimeInSec, setRemainingTimeInSec] = useState<number | null>(null);
  const [nextPhaseAt, setNextPhaseAt] = useState<number | null>(null);

  useEffect(() => {
    return watchNextPhaseAt(matchInfo.roomId, setNextPhaseAt, true);
  }, [matchInfo.roomId]);

  // useEffect(() => {
  //   const updateRemainingTime = async () => {
  //     if (!isReady || nextPhaseAt === null) {
  //       return;
  //     }

  //     const remainingMs = Math.max(0, nextPhaseAt - now());
  //     setRemainingTimeInSec(toRemainingTimeInSec(remainingMs));

  //     if (remainingMs > 0) {
  //       window.setTimeout(updateRemainingTime, Math.min(remainingMs, 1000));
  //     }
  //   };

  //   updateRemainingTime();
  // }, [isReady, nextPhaseAt, now]);

  useEffect(() => {
    if (!isReady || nextPhaseAt === null) {
      setRemainingTimeInSec(null);
      return;
    }

    let timeoutId: number | undefined;
    let disposed = false;

    const updateRemainingTime = () => {
      if (disposed) {
        return;
      }

      const remainingMs = Math.max(0, nextPhaseAt - now());

      setRemainingTimeInSec(toRemainingTimeInSec(remainingMs));

      if (remainingMs > 0) {
        timeoutId = window.setTimeout(updateRemainingTime, Math.min(remainingMs, 1000));
      }
    };

    updateRemainingTime();

    return () => {
      disposed = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isReady, nextPhaseAt, now]);

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
  disabled?: boolean;
  onClick?: () => void;
};
function CardButton({src, label, disabled = false, onClick}: CardButtonProps) {
  return (
    <IconButton
      className="card-button"
      iconSrc={src}
      label={label}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

const HAND_SUBMISSION_RETRY_INTERVAL_MS = 1000;
const MINIMUM_REQUEST_MARGIN_MS = 250;
type UseScheduledHandSubmissionArgs = {
  deadline: number | null;
  selectedHand: HandId;
  roundNumber: number;
  submitHand: (hand: HandId, roundId: number) => Promise<void>;
};
export function useScheduledHandSubmission({
  deadline,
  selectedHand,
  roundNumber,
  submitHand,
}: UseScheduledHandSubmissionArgs) {
  const {isReady, now} = useServerClock();

  const selectedHandRef = useRef(selectedHand);
  const submitHandRef = useRef(submitHand);
  const submittedRoundRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);

  // nullはdeadlineまたは時刻情報の読み込み中を表す
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    selectedHandRef.current = selectedHand;
  }, [selectedHand]);

  useEffect(() => {
    submitHandRef.current = submitHand;
  }, [submitHand]);

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
        await submitHandRef.current(selectedHandRef.current, roundNumber);
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

type SelectingPhaseDivProps = {
  matchInfo: MatchInfo;
  roundNumber: number;
  onFinishSubmission: () => void;
};
function SelectingPhaseDiv({matchInfo, roundNumber, onFinishSubmission}: SelectingPhaseDivProps) {
  const {matchPoint, thinkingTimeInSec} = matchInfo;
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
    submitHand: async (hand) => {
      if (!isValidPushId(matchInfo.roomId)) {
        throw new Error();
      }
      await submitHand(matchInfo.roomId, hand, roundNumber);

      onFinishSubmission();
    },
  };

  const remainingMs = useScheduledHandSubmission(args);
  const remainingSeconds = remainingMs === null ? null : toRemainingTimeInSec(remainingMs);

  return (
    <MainDiv>
      <p>{remainingSeconds === null ? "残り時間を取得中..." : `残り${remainingSeconds}秒`}</p>
      <div className="card-container">
        <CardButton
          src={HANDS.CHARGE.imageSrc}
          label={HANDS.CHARGE.label}
          onClick={() => setSelectedHand(HAND_IDS.CHARGE)}
        />
        <CardButton
          src={HANDS.DEFENSE.imageSrc}
          label={HANDS.DEFENSE.label}
          onClick={() => setSelectedHand(HAND_IDS.DEFENSE)}
        />
        <CardButton
          src={HANDS.ATTACK.imageSrc}
          label={HANDS.ATTACK.label}
          onClick={() => setSelectedHand(HAND_IDS.ATTACK)}
        />
        <CardButton
          src={HANDS.BEAM.imageSrc}
          label={HANDS.BEAM.label}
          onClick={() => setSelectedHand(HAND_IDS.BEAM)}
        />
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
  const [roundNumber, setRoundNumber] = useState<number>(INITIAL_VALUES_IN_BATTLE.ROUND_NUMBER);
  const [hostMana, setHostMana] = useState<number>(INITIAL_VALUES_IN_BATTLE.MANA);
  const [hostScore, setHostScore] = useState<number>(INITIAL_VALUES_IN_BATTLE.SCORE);
  const [guestMana, setGuestMana] = useState<number>(INITIAL_VALUES_IN_BATTLE.MANA);
  const [guestScore, setGuestScore] = useState<number>(INITIAL_VALUES_IN_BATTLE.SCORE);

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
    return watchGamePhase(matchInfo.roomId, setGamePhase, true);
  }, [matchInfo.roomId]);

  useEffect(() => {
    return watchCurrentRoundNumber(matchInfo.roomId, setRoundNumber, true);
  }, [matchInfo.roomId]);

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
      {gamePhase === GAME_PHASES.SELECTING && (
        <SelectingPhaseDiv
          matchInfo={matchInfo}
          roundNumber={roundNumber}
          onFinishSubmission={() => {
            setGamePhase(GAME_PHASES.RESOLVED);
          }}
        />
      )}
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
