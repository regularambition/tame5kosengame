import "./HowToPlayScreen.css";

import {useState} from "react";

import {BackArrowButton} from "./ui/BackArrowButton";
import {PagingUiRow} from "./ui/PagingUiRow";

import {HANDS, type HandId} from "../constants/hands";

import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";

type HowToPlayScreenProps = {
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
    <div className="htp-page-content not-playing-text-general">
      <h2 className="htp-section-title">基本的なルール</h2>
      <span>相手の手に勝てる相性の手を出すと1点獲得</span>
      <span>決められた数だけ点を先取したら勝利</span>
      <span>切断時は30秒以内であれば再接続可能</span>
    </div>
  );
}

function HandEffectPage({description, handId, title}: HandEffect) {
  const hand = HANDS[handId];

  return (
    <div className="htp-page-content">
      <h2 className="htp-section-title">それぞれの手の効果</h2>
      <div className="htp-hand-detail">
        <img className="htp-hand-detail-image" src={hand.imageSrc} alt={title} />
        <div className="htp-hand-detail-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

function MatchupPage() {
  return (
    <div className="htp-page-content ">
      <h2 className="htp-section-title">手どうしの相性表</h2>
      <table className="htp-matchup-table">
        <thead>
          <tr>
            <th className="htp-matchup-empty" colSpan={2} />
            <th colSpan={MATCHUP_HAND_IDS.length}>相手の手</th>
          </tr>
          <tr>
            <th className="htp-matchup-empty" colSpan={2} />
            {MATCHUP_HAND_IDS.map((handId) => (
              <th key={handId}>
                <img
                  className="htp-matchup-hand-image"
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
                <th className="htp-matchup-self-side" rowSpan={MATCHUP_HAND_IDS.length}>
                  自<br />分<br />の<br />手
                </th>
              )}
              <th>
                <img
                  className="htp-matchup-hand-image"
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

export function HowToPlayScreen({onBackToTop}: HowToPlayScreenProps) {
  const [pageIndex, setPageIndex] = useState(0);

  return (
    <main className="screen using-full-height vertical-alignment horizontal-centering vertical-centering">
      <ScreenBanner s={SCREEN_NAMES.HOW_TO_PLAY} />
      <BackArrowButton onClick={onBackToTop} />

      {RULE_PAGES[pageIndex]}

      <PagingUiRow
        pageIndex={pageIndex}
        pageCount={RULE_PAGES.length}
        onClickLeft={() => setPageIndex((page) => page - 1)}
        onClickRight={() => setPageIndex((page) => page + 1)}
      />
    </main>
  );
}
