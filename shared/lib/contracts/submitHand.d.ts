import { HandId } from "../constants/handIds.js";
export type SubmitHandRequest = {
    roomId: string;
    hand: HandId;
    roundNumber: number;
};
export type SubmitHandResponse = {
    hasSucceeded: boolean;
};
