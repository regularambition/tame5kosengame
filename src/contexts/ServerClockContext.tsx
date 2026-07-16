import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {onValue, ref} from "firebase/database";
import {database} from "../firebase";

type ClockAnchor = {
  serverTimeMs: number;
  monotonicTimeMs: number;
};

type ServerClock = {
  isReady: boolean;
  now: () => number;
};

const ServerClockContext = createContext<ServerClock | null>(null);

export function ServerClockProvider({children}: {children: ReactNode}) {
  const anchorRef = useRef<ClockAnchor | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log("##########");
    console.log("time offset setting called");
    console.log("##########");

    const offsetRef = ref(database, ".info/serverTimeOffset");

    return onValue(offsetRef, (snapshot) => {
      const offset = snapshot.val();

      if (typeof offset !== "number") {
        anchorRef.current = null;
        setIsReady(false);
        return;
      }

      anchorRef.current = {
        serverTimeMs: Date.now() + offset,
        monotonicTimeMs: performance.now(),
      };
      setIsReady(true);
    });
  }, []);

  const now = useCallback(() => {
    const anchor = anchorRef.current;

    if (!anchor) {
      throw new Error("Server clock has not been initialized.");
    }

    return anchor.serverTimeMs + (performance.now() - anchor.monotonicTimeMs);
  }, []);

  return (
    <ServerClockContext.Provider value={{isReady, now}}>{children}</ServerClockContext.Provider>
  );
}

export function useServerClock() {
  const clock = useContext(ServerClockContext);

  if (!clock) {
    throw new Error("useServerClock must be used inside ServerClockProvider.");
  }

  return clock;
}
