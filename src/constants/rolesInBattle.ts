export const ROLES_IN_BATTLE = {
  HOST_OF_RANDOM_MATCH: "hostOfRandomMatch",
  GUEST_OF_RANDOM_MATCH: "guestOfRandomMatch",
  HOST_OF_PRIVATE_MATCH: "hostOfPrivateMatch",
  GUEST_OF_PRIVATE_MATCH: "guestOfPrivateMatch",
  SPECTATOR: "spectator",
} as const;

export type RolesInBattleId = (typeof ROLES_IN_BATTLE)[keyof typeof ROLES_IN_BATTLE];

export function isRandomMatch(arg: RolesInBattleId): boolean {
  return (
    arg == ROLES_IN_BATTLE.HOST_OF_RANDOM_MATCH || arg == ROLES_IN_BATTLE.GUEST_OF_RANDOM_MATCH
  );
}

export function isPrivateMatch(arg: RolesInBattleId): boolean {
  return !isRandomMatch(arg);
}

export function isHost(arg: RolesInBattleId): boolean {
  return (
    arg == ROLES_IN_BATTLE.HOST_OF_RANDOM_MATCH || arg == ROLES_IN_BATTLE.HOST_OF_PRIVATE_MATCH
  );
}

export function isGuest(arg: RolesInBattleId): boolean {
  return (
    arg == ROLES_IN_BATTLE.GUEST_OF_RANDOM_MATCH || arg == ROLES_IN_BATTLE.GUEST_OF_PRIVATE_MATCH
  );
}

export function isSpectator(arg: RolesInBattleId): boolean {
  return arg == ROLES_IN_BATTLE.SPECTATOR;
}

export function isPlayer(arg: RolesInBattleId): boolean {
  return !isSpectator(arg);
}
