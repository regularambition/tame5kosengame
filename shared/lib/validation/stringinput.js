import { USER_NAME_RULES } from "../inputrules/index.js";
const REGULAR_EXPRESSIONS = {
    USER_NAME: new RegExp(`^${USER_NAME_RULES.CHAR_CLASS}{${USER_NAME_RULES.MIN_LENGTH},${USER_NAME_RULES.MAX_LENGTH}}$`),
};
function isValidStringInput(str, regex) {
    return regex.test(str);
}
export function isValidUserName(username) {
    console.log("##### isValidUserName called #####");
    return isValidStringInput(username, REGULAR_EXPRESSIONS.USER_NAME);
}
