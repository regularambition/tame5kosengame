import {useState} from "react";

import {Button} from "./ui/Button";
import {ButtonRow} from "./ui/ButtonRow";
import {BackArrowButton} from "./ui/BackArrowButton";
import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {GameSettings} from "../types/GameSettings";
import {CenterAligningDiv} from "./ui/CenterAligningDiv";

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

type MakeOrEnterDivProps = {
  onClickMake: () => void;
  onClickEnter: () => void;
};

function MakeOrEnterDiv({onClickMake, onClickEnter}: MakeOrEnterDivProps) {
  return (
    <div className="using-full-height vertical-alignment horizontal-centering vertical-centering">
      <ButtonRow>
        <Button onClick={onClickMake} type="button">
          部屋を建てる
        </Button>
        <Button onClick={onClickEnter} type="button">
          部屋に入る
        </Button>
      </ButtonRow>
    </div>
  );
}

type MatchRulesSettingDivProps = {onRoomCreating: () => void};

function MatchRulesSettingDiv({onRoomCreating}: MatchRulesSettingDivProps) {
  return (
    <CenterAligningDiv className="using-full-height vertical-centering">
      <p className="error-and-annotation">
        ※部屋が建った後はDiscordやTwitter等を利用して
        <br />
        対戦相手や観戦者に部屋IDを連携してください
      </p>
      <Button onClick={onRoomCreating} type="button">
        この条件で建てる
      </Button>
    </CenterAligningDiv>
  );
}

export function PrivateMatchScreen({gameSettings, onBackToTop}: PrivateMatchScreenProps) {
  const [state, setState] = useState<StateId>(STATES.MAKE_OR_ENTER);
  const [isPlayer, setIsPlayer] = useState<boolean>(true);

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
      {state === STATES.MATCH_RULES_SETTING && <MatchRulesSettingDiv onRoomCreating={() => {}} />}
      {state === STATES.ENTERING_ROOM_ID && <h2>部屋IDを入力</h2>}
    </main>
  );
}
