/**
 * Canonical stat name mapping — single source of truth.
 *
 * Frontend uses camelCase (e.g. "defWorkrate").
 * Database uses snake_case (e.g. "def_workrate").
 * Player aggregate columns append "_avg" (e.g. "def_workrate_avg").
 */

import type { PlayerStats } from "@/types/stats";

/** Frontend stat key → database column base name */
export const STAT_TO_DB: Record<keyof PlayerStats, string> = {
    anticipation: "anticipation",
    defWorkrate: "def_workrate",
    composure: "composure",
    offTheBall: "off_the_ball",
    vision: "vision",
    firstTouch: "first_touch",
    passing: "passing",
    tackling: "tackling",
    finishing: "finishing",
    speed: "speed",
    strength: "strength",
    agility: "agility",
    attWorkrate: "att_workrate",
    crossing: "crossing",
    positioning: "positioning",
    technique: "technique",
    dribbling: "dribbling",
    decisions: "decisions",
    marking: "marking",
    heading: "heading",
    aggression: "aggression",
    flair: "flair",
    longShots: "long_shots",
    stamina: "stamina",
    teamwork: "teamwork",
    determination: "determination",
    leadership: "leadership",
    concentration: "concentration",
};

/** Database aggregate column (with _avg suffix) → frontend stat key */
export const DB_AVG_TO_STAT: Record<string, keyof PlayerStats> = Object.fromEntries(
    Object.entries(STAT_TO_DB).map(([stat, db]) => [`${db}_avg`, stat as keyof PlayerStats])
) as Record<string, keyof PlayerStats>;
