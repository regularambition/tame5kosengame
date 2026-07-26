import { HAND_IDS } from "../constants/handIds.js";
export function isValidHand(hand) {
    return Object.values(HAND_IDS).includes(hand);
}
