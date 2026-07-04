import handAttack from "../assets/hands/attack.png";
import handBeam from "../assets/hands/beam.png";
import handCharge from "../assets/hands/charge.png";
import handDefense from "../assets/hands/defense.png";

export const HANDS = {
  ATTACK: {
    id: "ATTACK",
    label: "攻撃",
    description: "1マナを消費して相手に攻撃を仕掛ける",
    imageSrc: handAttack,
  },
  BEAM: {
    id: "BEAM",
    label: "光線",
    description:
      "5マナを消費して防御不可能な光線で攻撃（この手で勝利した場合、1点ではなく2点獲得）",
    imageSrc: handBeam,
  },
  CHARGE: {
    id: "CHARGE",
    label: "蓄積",
    description: "自分のマナを1だけ増やす",
    imageSrc: handCharge,
  },
  DEFENSE: {
    id: "DEFENSE",
    label: "防御",
    description: "相手の攻撃から身を守る",
    imageSrc: handDefense,
  },
} as const;

export type HandId = keyof typeof HANDS;

export const HAND_LIST = Object.values(HANDS);
