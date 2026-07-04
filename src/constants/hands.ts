import handAttack from "../assets/hands/attack.png";
import handBeam from "../assets/hands/beam.png";
import handCharge from "../assets/hands/charge.png";
import handDefense from "../assets/hands/defense.png";

export const HANDS = {
  ATTACK: {
    id: "ATTACK",
    label: "ATTACK",
    imageSrc: handAttack,
  },
  BEAM: {
    id: "BEAM",
    label: "BEAM",
    imageSrc: handBeam,
  },
  CHARGE: {
    id: "CHARGE",
    label: "CHARGE",
    imageSrc: handCharge,
  },
  DEFENSE: {
    id: "DEFENSE",
    label: "DEFENSE",
    imageSrc: handDefense,
  },
} as const;

export type HandId = keyof typeof HANDS;

export const HAND_LIST = Object.values(HANDS);
