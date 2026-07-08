import {
  USER_NAME_RULES,
  VALID_NUMBER_RANGE,
  ValidNumberRangeId,
  JOIN_CODE_RULES,
  PUSH_ID_RULES,
} from "../inputrules/index.js";

const REGULAR_EXPRESSIONS = {
  USER_NAME: new RegExp(
    `^${USER_NAME_RULES.CHAR_CLASS}{${USER_NAME_RULES.MIN_LENGTH},${USER_NAME_RULES.MAX_LENGTH}}$`,
  ),
  MATCH_POINT: new RegExp("^[1-9]{1}[0-9]{0,1}$"),
  THINKING_TIME: new RegExp("^[1-9]{1}[0-9]{0,1}$"),
  JOIN_CODE: new RegExp(`${JOIN_CODE_RULES.CHAR_CLASS}{${JOIN_CODE_RULES.LENGTH}}$`),
  PUSH_ID: new RegExp(`${PUSH_ID_RULES.CHAR_CLASS}{${PUSH_ID_RULES.LENGTH}}$`),
} as const;

function isValidStringInput(str: string, regex: RegExp): boolean {
  return regex.test(str);
}

export function isValidUserName(username: string): boolean {
  return isValidStringInput(username, REGULAR_EXPRESSIONS.USER_NAME);
}

function isIncludedByValidRange(num: number, id: ValidNumberRangeId): boolean {
  return id.minimum <= num && num <= id.maximum;
}

export function isValidMatchPoint(matchPoint: string): boolean {
  if (!isValidStringInput(matchPoint, REGULAR_EXPRESSIONS.MATCH_POINT)) {
    return false;
  }

  const num = parseInt(matchPoint);
  return isIncludedByValidRange(num, VALID_NUMBER_RANGE.MATCH_POINT);
}

export function isValidThinkingTime(thinkingTime: string): boolean {
  if (!isValidStringInput(thinkingTime, REGULAR_EXPRESSIONS.THINKING_TIME)) {
    return false;
  }

  const num = parseInt(thinkingTime);
  return isIncludedByValidRange(num, VALID_NUMBER_RANGE.THINKING_TIME);
}

export function isValidJoinCode(joinCode: string): boolean {
  return isValidStringInput(joinCode, REGULAR_EXPRESSIONS.JOIN_CODE);
}

export function isValidPushId(pushId: string): boolean {
  return isValidStringInput(pushId, REGULAR_EXPRESSIONS.PUSH_ID);
}
