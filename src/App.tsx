import {useEffect, useState} from "react";
import "./App.css";
import {signInAnonymously} from "firebase/auth";
import {TitleScreen} from "./components/TitleScreen";
import {TopScreen} from "./components/TopScreen";
import {UserNameScreen} from "./components/UserNameScreen";
import {SettingsScreen} from "./components/SettingsScreen";
import {HowToPlayScreen} from "./components/HowToPlayScreen";
import {CreditsScreen} from "./components/CreditsScreen";
import {auth} from "./firebase";
import {ensureUserProfile} from "./api/ensureUserProfile";
import {updateUserName} from "./api/updateUserName";

import {SCREEN_NAMES, Screen} from "./constants/screenNames";
import {RandomMatchScreen} from "./components/RandomMatchScreen";
import {PrivateMatchScreen} from "./components/PrivateMatchScreen";
import {DEFAULT_GAME_SETTINGS, GameSettings, GAME_SETTINGS_STORAGE_KEY} from "./types/GameSettings";
import {DEFAULT_MATCH_RULES} from "./types/MatchRules";
import {InBattleScreen} from "./components/InBattleScreen";
import {ROLES_IN_BATTLE, RolesInBattleId} from "./constants/rolesInBattle";

function loadGameSettings(): GameSettings {
  const savedSettings = localStorage.getItem(GAME_SETTINGS_STORAGE_KEY);

  if (!savedSettings) {
    return DEFAULT_GAME_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_GAME_SETTINGS,
      ...JSON.parse(savedSettings),
    };
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

export type MatchInfo = {
  roomId: string;
  role: RolesInBattleId;
  hostName: string;
  guestName: string;
  matchPoint: number;
  thinkingTimeInSec: number;
};

function App() {
  const [screen, setScreen] = useState<Screen>(SCREEN_NAMES.GAME_TITLE);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const [userName, setUserName] = useState("");
  const [gameSettings, setGameSettings] = useState<GameSettings>(loadGameSettings());
  useEffect(() => {
    localStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(gameSettings));
  }, [gameSettings]);

  const [matchInfo, setMatchInfo] = useState<MatchInfo>({
    roomId: "",
    role: ROLES_IN_BATTLE.HOST_OF_RANDOM_MATCH,
    hostName: "",
    guestName: "",
    matchPoint: DEFAULT_MATCH_RULES.matchPoint,
    thinkingTimeInSec: DEFAULT_MATCH_RULES.thinkingTimeInSec,
  });

  const handleStart = async () => {
    if (isAuthenticating) {
      return;
    }

    try {
      setIsAuthenticating(true);
      setAuthError("");

      await signInAnonymously(auth);

      console.log("anonymous signin finished!");

      const userProfile = await ensureUserProfile();
      console.log("ensureUserProfile finished!");
      console.log(userProfile);
      setScreen(userProfile.data.userName.length > 0 ? SCREEN_NAMES.TOP : SCREEN_NAMES.USER_NAME);
      setUserName(userProfile.data.userName);
    } catch {
      setAuthError("認証に失敗しました。もう一度クリックしてください");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegisterName = async (name: string) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setScreen(SCREEN_NAMES.GAME_TITLE);
      setAuthError("認証情報が見つかりません。もう一度お試しください");
      return;
    }

    await updateUserName(name);
    console.log("updateUserName finished!");
    setUserName(name);
    setScreen(SCREEN_NAMES.TOP);
  };

  if (screen === SCREEN_NAMES.GAME_TITLE) {
    return <TitleScreen error={authError} isLoading={isAuthenticating} onStart={handleStart} />;
  }

  if (screen === SCREEN_NAMES.USER_NAME) {
    return (
      <UserNameScreen
        isUpdate={userName.length > 0}
        onSubmit={handleRegisterName}
        onBack={() => {
          if (userName.length > 0) {
            setScreen(SCREEN_NAMES.TOP);
          }
        }}
      />
    );
  }

  if (screen === SCREEN_NAMES.SETTINGS) {
    return (
      <SettingsScreen
        gameSettings={gameSettings}
        onChangeGameSettings={setGameSettings}
        onBack={() => setScreen(SCREEN_NAMES.TOP)}
      />
    );
  }

  if (screen === SCREEN_NAMES.HOW_TO_PLAY) {
    return <HowToPlayScreen onBackToTop={() => setScreen(SCREEN_NAMES.TOP)} />;
  }

  if (screen === SCREEN_NAMES.CREDITS) {
    return <CreditsScreen onBackToTop={() => setScreen(SCREEN_NAMES.TOP)} />;
  }

  if (screen === SCREEN_NAMES.RANDOM_MATCH) {
    return <RandomMatchScreen onBackToTop={() => setScreen(SCREEN_NAMES.TOP)} />;
  }

  if (screen === SCREEN_NAMES.PRIVATE_MATCH) {
    return (
      <PrivateMatchScreen
        gameSettings={gameSettings}
        onBackToTop={() => setScreen(SCREEN_NAMES.TOP)}
        userName={userName}
        onStartBattle={(nextMatchInfo: MatchInfo) => {
          setMatchInfo(nextMatchInfo);
          setScreen(SCREEN_NAMES.IN_BATTLE);
        }}
      />
    );
  }

  if (screen === SCREEN_NAMES.IN_BATTLE) {
    return <InBattleScreen matchInfo={matchInfo}></InBattleScreen>;
  }

  return (
    <TopScreen
      onRandomMatchClick={() => setScreen(SCREEN_NAMES.RANDOM_MATCH)}
      onPrivateMatchClick={() => setScreen(SCREEN_NAMES.PRIVATE_MATCH)}
      onRulesClick={() => setScreen(SCREEN_NAMES.HOW_TO_PLAY)}
      onSettingsClick={() => setScreen(SCREEN_NAMES.SETTINGS)}
      onUserNameClick={() => setScreen(SCREEN_NAMES.USER_NAME)}
      onCreditClick={() => setScreen(SCREEN_NAMES.CREDITS)}
      userName={userName}
    />
  );
}

export default App;
