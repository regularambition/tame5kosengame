import {useState} from "react";

import {Button, BUTTON_COLOR_TYPE} from "./ui/Button";
import {ButtonRow} from "./ui/ButtonRow";
import {BackArrowButton} from "./ui/BackArrowButton";

import {HANDS, type HandId} from "../constants/hands";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

type RuleScreenProps = {
  onBackToTop: () => void;
};

type HandEffect = {
  handId: HandId;
  title: string;
  description: string;
};

const HAND_EFFECTS: HandEffect[] = [
  {
    handId: HANDS.CHARGE.id,
    title: HANDS.CHARGE.label,
    description: HANDS.CHARGE.description,
  },
  {
    handId: HANDS.DEFENSE.id,
    title: HANDS.DEFENSE.label,
    description: HANDS.DEFENSE.description,
  },
  {
    handId: HANDS.ATTACK.id,
    title: HANDS.ATTACK.label,
    description: HANDS.ATTACK.description,
  },
  {
    handId: HANDS.BEAM.id,
    title: HANDS.BEAM.label,
    description: HANDS.BEAM.description,
  },
];

const MATCHUP_HAND_IDS: HandId[] = [
  HANDS.CHARGE.id,
  HANDS.DEFENSE.id,
  HANDS.ATTACK.id,
  HANDS.BEAM.id,
];

const MATCHUP_RESULTS: Record<HandId, Record<HandId, string>> = {
  ATTACK: {
    ATTACK: "-",
    BEAM: "負け",
    CHARGE: "勝ち",
    DEFENSE: "-",
  },
  BEAM: {
    ATTACK: "勝ち",
    BEAM: "-",
    CHARGE: "勝ち",
    DEFENSE: "勝ち",
  },
  CHARGE: {
    ATTACK: "負け",
    BEAM: "負け",
    CHARGE: "-",
    DEFENSE: "-",
  },
  DEFENSE: {
    ATTACK: "-",
    BEAM: "負け",
    CHARGE: "-",
    DEFENSE: "-",
  },
};

function BasicRulePage() {
  return (
    <div className="rule-page-content rule-page-text">
      <p>相手の手に勝てる相性の手を出すと1点獲得</p>
      <p>決められた数だけ点を先取した側の勝利</p>
      <p>切断時は30秒以内であれば再接続可能（間に合わない場合は強制敗北）</p>
    </div>
  );
}

function HandEffectPage({description, handId, title}: HandEffect) {
  const hand = HANDS[handId];

  return (
    <div className="rule-page-content rule-hand-page">
      <h2 className="rule-section-title">それぞれの手の効果</h2>
      <div className="rule-hand-detail">
        <img className="rule-hand-detail-image" src={hand.imageSrc} alt={title} />
        <div className="rule-hand-detail-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

function MatchupPage() {
  return (
    <div className="rule-page-content rule-matchup-page">
      <h2 className="rule-section-title">手どうしの相性表</h2>
      <table className="rule-matchup-table">
        <thead>
          <tr>
            <th className="rule-matchup-empty" colSpan={2} />
            <th className="rule-matchup-side" colSpan={MATCHUP_HAND_IDS.length}>
              相手側
            </th>
          </tr>
          <tr>
            <th className="rule-matchup-empty" colSpan={2} />
            {MATCHUP_HAND_IDS.map((handId) => (
              <th key={handId}>
                <img
                  className="rule-matchup-hand-image"
                  src={HANDS[handId].imageSrc}
                  alt={HANDS[handId].label}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATCHUP_HAND_IDS.map((selfHandId, rowIndex) => (
            <tr key={selfHandId}>
              {rowIndex === 0 && (
                <th className="rule-matchup-self-side" rowSpan={MATCHUP_HAND_IDS.length}>
                  自<br />分<br />側
                </th>
              )}
              <th>
                <img
                  className="rule-matchup-hand-image"
                  src={HANDS[selfHandId].imageSrc}
                  alt={HANDS[selfHandId].label}
                />
              </th>
              {MATCHUP_HAND_IDS.map((opponentHandId) => (
                <td key={opponentHandId}>{MATCHUP_RESULTS[selfHandId][opponentHandId]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RULE_PAGES = [
  <BasicRulePage key="basic" />,
  ...HAND_EFFECTS.map((effect) => <HandEffectPage key={effect.handId} {...effect} />),
  <MatchupPage key="matchup" />,
];

export function RuleScreen({onBackToTop}: RuleScreenProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageNumber = pageIndex + 1;

  return (
    <main className="screen rule-screen">
      <ScreenBanner s={SCREEN_NAMES.RULES} />
      <BackArrowButton onClick={onBackToTop} />
      <header className="rule-header">
        <h1 className="rule-title">ルール説明</h1>
        <p className="rule-page-count">
          {pageNumber}/{RULE_PAGES.length}
        </p>
      </header>

      {RULE_PAGES[pageIndex]}

      <ButtonRow>
        <Button
          colorVariant={BUTTON_COLOR_TYPE.PAGE}
          disabled={pageIndex === 0}
          onClick={() => setPageIndex((page) => page - 1)}
          type="button"
        >
          1ページ戻す
        </Button>
        <Button
          colorVariant={BUTTON_COLOR_TYPE.PAGE}
          disabled={pageIndex === RULE_PAGES.length - 1}
          onClick={() => setPageIndex((page) => page + 1)}
          type="button"
        >
          1ページ進める
        </Button>
      </ButtonRow>
    </main>
  );
}
