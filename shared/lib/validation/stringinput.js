import { USER_NAME_RULES, VALID_NUMBER_RANGE, JOIN_CODE_RULES, } from "../inputrules/index.js";
const REGULAR_EXPRESSIONS = {
    USER_NAME: new RegExp(`^${USER_NAME_RULES.CHAR_CLASS}{${USER_NAME_RULES.MIN_LENGTH},${USER_NAME_RULES.MAX_LENGTH}}$`),
    MATCH_POINT: new RegExp("^[1-9]{1}[0-9]{0,1}$"),
    THINKING_TIME: new RegExp("^[1-9]{1}[0-9]{0,1}$"),
    JOIN_CODE: new RegExp(`${JOIN_CODE_RULES.CHAR_CLASS}{${JOIN_CODE_RULES.LENGTH}}$`),
};
function isValidStringInput(str, regex) {
    return regex.test(str);
}
export function isValidUserName(username) {
    return isValidStringInput(username, REGULAR_EXPRESSIONS.USER_NAME);
}
function isIncludedByValidRange(num, id) {
    return id.minimum <= num && num <= id.maximum;
}
export function isValidMatchPoint(matchPoint) {
    if (!isValidStringInput(matchPoint, REGULAR_EXPRESSIONS.MATCH_POINT)) {
        return false;
    }
    const num = parseInt(matchPoint);
    return isIncludedByValidRange(num, VALID_NUMBER_RANGE.MATCH_POINT);
}
export function isValidThinkingTime(thinkingTime) {
    if (!isValidStringInput(thinkingTime, REGULAR_EXPRESSIONS.THINKING_TIME)) {
        return false;
    }
    const num = parseInt(thinkingTime);
    return isIncludedByValidRange(num, VALID_NUMBER_RANGE.THINKING_TIME);
}
export function isValidJoinCode(roomId) {
    return isValidStringInput(roomId, REGULAR_EXPRESSIONS.JOIN_CODE);
}
