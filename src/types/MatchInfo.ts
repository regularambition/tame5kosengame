import {ROLES_IN_BATTLE, RolesInBattleId} from "../constants/rolesInBattle";
import {DEFAULT_MATCH_RULES} from "./MatchRules";

export type MatchInfo = {
  roomId: string;
  role: RolesInBattleId;
  hostName: string;
  guestName: string;
  matchPoint: number;
  thinkingTimeInSec: number;
};

export const DEFAULT_MATCH_INFO = {
  roomId: "",
  role: ROLES_IN_BATTLE.HOST_OF_RANDOM_MATCH,
  hostName: "",
  guestName: "",
  matchPoint: DEFAULT_MATCH_RULES.matchPoint,
  thinkingTimeInSec: DEFAULT_MATCH_RULES.thinkingTimeInSec,
};
