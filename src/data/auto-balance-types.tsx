import { ZoneKeys, ZonePositions, getPointForPosition, ZoneScores, PositionWeighting, Weighting } from "@/data/position-types";
import { ScoredGamePlayer, FilledGamePlayer, calculateScoresForStats } from "@/data/player-types";

/*
AUTO BALANCE:

Our core data types for things like positions, zones, weights, etc, are stored in named record types
However, for monte carlo simulations in our auto balance methods, we prefer raw arrays for raw speed
The below types are designed to convert the named types to raw types for our mass sorting/splitting algorithms
found in auto-balance. 

Currently these arrays are rigid by design but the manual work to alter them (add/remove positionss) is non ideal
Need to generate auto sized types based on the record structures
*/


// we can probably find a better way to automate these arrays based on the record
export type GKPlayers = [
    PositionedGamePlayer[], // GK
];

export type DEFPlayers = [
    PositionedGamePlayer[], // CB
    PositionedGamePlayer[], // FB
];

export type MIDPlayers = [
    PositionedGamePlayer[], // DM
    PositionedGamePlayer[], // CM
    PositionedGamePlayer[], // WM
    PositionedGamePlayer[], // AM
];

export type ATTPlayers = [
    PositionedGamePlayer[], // ST
    PositionedGamePlayer[], // WR
];

export type GKScores = [
    number, // GK
];

export type DEFScores = [
    number, // CB
    number, // FB
];

export type MIDScores = [
    number, // DM
    number, // CM
    number, // WM
    number, // AM
];

export type ATTScores = [
    number, // ST
    number, // WR
];

export type ZoneTotals = [
    number, // GK
    number, // DEF
    number, // MID
    number, // ATT
];

export type ZonePlayers = [
    GKPlayers, // GK
    DEFPlayers, // DEF
    MIDPlayers, // MID
    ATTPlayers, // ATT
];

export type ZoneScoresArray = [
    GKScores, // GK
    DEFScores, // DEF
    MIDScores, // MID
    ATTScores, // ATT
];

export interface ArrayScoredGamePlayer extends ScoredGamePlayer {
    zoneFitArr: ZoneScoresArray;
}

export interface PositionedGamePlayer extends ArrayScoredGamePlayer {
    generatedPositionInfo: PositionWeighting;
}

export const emptyZonePlayers: ZonePlayers = [
    [[]],          // GKPlayers
    [[], []],      // DEFPlayers
    [[], [], [], []],  // MIDPlayers
    [[], []],      // ATTPlayers
];

export const emptyZoneScores: ZoneScoresArray = [
    [0],          // GKPlayers
    [0, 0],      // DEFPlayers
    [0, 0, 0, 0],  // MIDPlayers
    [0, 0],      // ATTPlayers
];

export const emptyTeamTotals: ZoneTotals = [
    0, // GK
    0, // DEF
    0, // MID
    0, // ATT
];

export type TeamAssignments = {
    team: ZonePlayers, score: number, totals: ZoneTotals;
};

export type TeamResults = {
    a: TeamAssignments;
    b: TeamAssignments;
};

export function zoneScoresToArray(scores: ZoneScores): ZoneScoresArray {
    const arrScores = structuredClone(emptyZoneScores);

    ZoneKeys.forEach((zone, zoneIndex) => {
        ZonePositions[zone]?.forEach((position, positionIndex) => {
            arrScores[zoneIndex][positionIndex] = scores[position] ?? 0;
        })
    })

    return arrScores;
}

export function toArrayScoredGamePlayers(players: ScoredGamePlayer[]): ArrayScoredGamePlayer[] {
    return players.map((player) => ({
        ...player,
        zoneFitArr: zoneScoresToArray(player.zoneFit),
    }));
}

export const assignPositions = (zones: ZonePlayers, team: string) => {
    const finalPlayers: ScoredGamePlayer[] = [];

    zones.forEach((zone) => {
        zone.forEach((players) => {
            players.forEach((player, pidx) => {
                finalPlayers.push({
                    ...player,
                    team,
                    position: getPointForPosition(player.generatedPositionInfo,
                        pidx,
                        players.length)
                } as ScoredGamePlayer);
            });
        });
    });

    return finalPlayers;
}

export const calculateScores = (players: FilledGamePlayer[], zoneWeights: Weighting): ScoredGamePlayer[] => {
    return players.map(player => {

        const zoneFit: ZoneScores = calculateScoresForStats(player.stats, zoneWeights);

        return { ...player, zoneFit } as ScoredGamePlayer;
    });
};