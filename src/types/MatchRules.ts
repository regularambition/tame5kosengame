export type MatchRules = {
  matchPoint: number;
  thinkingTimeInSec: number;
};

export const DEFAULT_MATCH_RULES: MatchRules = {
  // matchPoint: 5,
  // thinkingTimeInSec: 5,
  matchPoint: 3,
  thinkingTimeInSec: 15,
};
