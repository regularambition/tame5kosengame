import {useState} from "react";
import "./App.css";
import {signInAnonymously} from "firebase/auth";
import {TitleScreen} from "./components/TitleScreen";
import {TopScreen} from "./components/TopScreen";
import {UserNameScreen} from "./components/UserNameScreen";
import {SettingsScreen} from "./components/SettingsScreen";
import {RuleScreen} from "./components/RuleScreen";
import {CreditsScreen} from "./components/CreditsScreen";
import {auth} from "./firebase";
import {ensureUserProfile} from "./api/ensureUserProfile";
import {updateUserName} from "./api/updateUserName";

import {SCREEN_NAMES, Screen} from "./constants/screenNames";

function App() {
  const [screen, setScreen] = useState<Screen>(SCREEN_NAMES.GAME_TITLE);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isUserNameRegistered, setIsUserNameRegistered] = useState(false);

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
      setScreen(userProfile.data.alreadyRegistered ? SCREEN_NAMES.TOP : SCREEN_NAMES.USER_NAME);
      setIsUserNameRegistered(userProfile.data.alreadyRegistered);
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
    setIsUserNameRegistered(true);
    setScreen(SCREEN_NAMES.TOP);
  };

  if (screen === SCREEN_NAMES.GAME_TITLE) {
    return <TitleScreen error={authError} isLoading={isAuthenticating} onStart={handleStart} />;
  }

  if (screen === SCREEN_NAMES.USER_NAME) {
    console.log(`isUserNameRegistered = ${isUserNameRegistered}`);
    return (
      <UserNameScreen
        isUpdate={isUserNameRegistered}
        onSubmit={handleRegisterName}
        onBack={() => {
          if (isUserNameRegistered) {
            setScreen(SCREEN_NAMES.TOP);
          }
        }}
      />
    );
  }

  if (screen === SCREEN_NAMES.SETTINGS) {
    return <SettingsScreen onBack={() => setScreen(SCREEN_NAMES.TOP)} />;
  }

  if (screen === SCREEN_NAMES.RULES) {
    return <RuleScreen onBackToTop={() => setScreen(SCREEN_NAMES.TOP)} />;
  }

  if (screen === SCREEN_NAMES.CREDITS) {
    return <CreditsScreen onBackToTop={() => setScreen(SCREEN_NAMES.TOP)} />;
  }

  return (
    <TopScreen
      onEntranceClick={() => setScreen(SCREEN_NAMES.ENTRANCE)}
      onRulesClick={() => setScreen(SCREEN_NAMES.RULES)}
      onSettingsClick={() => setScreen(SCREEN_NAMES.SETTINGS)}
      onUserNameClick={() => setScreen(SCREEN_NAMES.USER_NAME)}
      onCreditClick={() => setScreen(SCREEN_NAMES.CREDITS)}
    />
  );
}

export default App;
