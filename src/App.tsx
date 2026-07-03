import {useState} from "react";
import "./App.css";
import {signInAnonymously} from "firebase/auth";
import {get, ref, serverTimestamp, set} from "firebase/database";
import {TitleScreen} from "./components/TitleScreen";
import {TopScreen} from "./components/TopScreen";
import {UserNameScreen} from "./components/UserNameScreen";
import {auth, database} from "./firebase";
import {ensureUserProfile} from "./api/ensureUserProfile";
import {updateUserName} from "./api/updateUserName";

const SCREEN_NAMES = {
  TITLE: "title",
  USER_NAME: "userName",
  TOP: "top",
} as const;

type Screen = (typeof SCREEN_NAMES)[keyof typeof SCREEN_NAMES];

function App() {
  const [screen, setScreen] = useState<Screen>(SCREEN_NAMES.TITLE);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleStart = async () => {
    if (isAuthenticating) {
      return;
    }

    try {
      setIsAuthenticating(true);
      setAuthError("");

      // const { user } = await signInAnonymously(auth)
      // const userSnapshot = await get(ref(database, `users/${user.uid}`))
      // setScreen(userSnapshot.exists() ? SCREEN_NAMES.TOP : SCREEN_NAMES.USER_NAME)

      await signInAnonymously(auth);

      console.log("anonymous signin finished!");

      const userInfo = await ensureUserProfile();
      console.log("ensureUserProfile finished!");
      console.log(userInfo);
      setScreen(userInfo.data.exists ? SCREEN_NAMES.TOP : SCREEN_NAMES.USER_NAME);
    } catch {
      setAuthError("認証に失敗しました。もう一度クリックしてください");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegisterName = async (name: string) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setScreen(SCREEN_NAMES.TITLE);
      setAuthError("認証情報が見つかりません。もう一度お試しください");
      return;
    }

    // await set(ref(database, `users/${currentUser.uid}`), {
    //     name,
    //     createdAt: serverTimestamp(),
    // })
    updateUserName(name);
    console.log("updateUserName finished!");
    setScreen(SCREEN_NAMES.TOP);
  };

  if (screen === SCREEN_NAMES.TITLE) {
    return <TitleScreen error={authError} isLoading={isAuthenticating} onStart={handleStart} />;
  }

  if (screen === SCREEN_NAMES.USER_NAME) {
    return <UserNameScreen onSubmit={handleRegisterName} />;
  }

  return <TopScreen />;
}

export default App;
