export type MatchRules = {
  matchPoint: number;
  handChoicePeriodInMs: number;
};

export const DEFAULT_MATCH_RULES: MatchRules = {
  matchPoint: 5,
  handChoicePeriodInMs: 5000,
};
