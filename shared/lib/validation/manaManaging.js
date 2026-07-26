import { HAND_IDS } from "../constants/handIds.js";
export function findManaGain(hand) {
    if (hand === HAND_IDS.CHARGE) {
        return 1;
    }
    else if (hand === HAND_IDS.ATTACK) {
        return -1;
    }
    else if (hand === HAND_IDS.BEAM) {
        return -5;
    }
    else {
        return 0;
    }
}
export function canSelectHand(hand, mana) {
    const newMana = mana + findManaGain(hand);
    return newMana >= 0;
}
