import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Papa from 'papaparse';
import type { DraftState, Player, Team, DraftStateSnapshot } from '../types';
import { PRESET_LEADERS, POOL_DATA } from '../constants';
import { trackEvent, ANALYTICS_EVENTS } from '../utils/analytics';

const INITIAL_STATE = {
    step: 'HOME' as 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING' | 'LOBBY',
    teams: [],
    players: [],
    positionNames: [],
    currentRound: 1,
    currentPickIndex: 0,
    draftHistory: [],
    isAIMode: false,
    userTeamId: null,
    isCustomMode: false,
    timeLeft: 30,
};

interface ExtendedDraftState extends DraftState {
    isAIMode: boolean;
    userTeamId: string | null;
    isCustomMode: boolean;
    timeLeft: number;
    loadPresetData: () => void;
    setAIMode: (isAI: boolean) => void;
    setUserTeamId: (teamId: string | null) => void;
    setTimeLeft: (time: number) => void;
    handleTimeout: () => void;
    skipTurn: () => void;
    makeAIPick: () => void;
    setCustomMode: (isCustom: boolean) => void;
    resetDraftingState: () => void;
    resetOrderState: () => void;
    syncState: (newState: Partial<DraftState>) => void; // New Action
    getSerializableState: () => Partial<DraftState>; // Helper for Multiplayer
    resetAll: () => void;
}

export const useDraftStore = create<ExtendedDraftState>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            syncState: (newState: Partial<DraftState>) => {
                set((state) => ({ ...state, ...newState }));
            },

            getSerializableState: () => {
                const state = get();
                return {
                    step: state.step,
                    teams: state.teams,
                    players: state.players,
                    positionNames: state.positionNames,
                    currentRound: state.currentRound,
                    currentPickIndex: state.currentPickIndex,
                    draftHistory: state.draftHistory,
                    isAIMode: state.isAIMode,
                    userTeamId: state.userTeamId,
                    isCustomMode: state.isCustomMode,
                    timeLeft: state.timeLeft,
                };
            },

            uploadData: (csv: string) => {
                const { data } = Papa.parse<string[]>(csv, { header: false });

                if (data.length < 5) {
                    set({ teams: [], players: [], positionNames: [] });
                    return;
                }

                const headerRow = data[0];
                const leaderNames = headerRow.slice(1).map(s => s.trim()).filter(s => s !== '');

                if (leaderNames.length !== 5) {
                    set({ teams: [], players: [], positionNames: [] });
                    return;
                }

                const teams: Team[] = leaderNames.map((name, index) => ({
                    id: `team-${index}`,
                    leaderName: name,
                    roster: {},
                    draftOrderIndex: -1,
                }));

                const players: Player[] = [];
                const positionNames: string[] = [];

                let playerIndex = 0;
                let validPositions = 0;

                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    const posName = row[0]?.trim();
                    if (!posName) continue;

                    const playerNames = row.slice(1).map(s => s.trim()).filter(s => s !== '');

                    if (playerNames.length !== 5) {
                        continue;
                    }

                    positionNames.push(posName);
                    validPositions++;

                    playerNames.forEach((name) => {
                        players.push({
                            id: `player-${playerIndex++}`,
                            name: name,
                            position: posName,
                            isDrafted: false,
                            draftedBy: null,
                        });
                    });
                }

                if (validPositions !== 4 || players.length !== 20) {
                    set({ teams: [], players: [], positionNames: [] });
                    return;
                }

                set({
                    teams,
                    players,
                    positionNames,
                    isAIMode: false,
                    userTeamId: null,
                });
            },

            loadPresetData: () => {
                const teams: Team[] = PRESET_LEADERS.map((name, index) => ({
                    id: `team-${index}`,
                    leaderName: name,
                    roster: {},
                    draftOrderIndex: -1,
                }));

                const players: Player[] = POOL_DATA.map((p, index) => ({
                    id: `player-${index}`,
                    ...p,
                    isDrafted: false,
                    draftedBy: null,
                }));

                const positionNames = Array.from(new Set(POOL_DATA.map(p => p.position)));

                set({
                    teams,
                    players,
                    positionNames,
                    step: 'ORDER_SETTING',
                });
            },

            setAIMode: (isAI: boolean) => {
                set({ isAIMode: isAI });
            },

            setUserTeamId: (teamId: string | null) => {
                set({ userTeamId: teamId });
            },

            setCustomMode: (isCustom: boolean) => {
                set({ isCustomMode: isCustom });
            },

            setTimeLeft: (time: number) => {
                set({ timeLeft: time });
            },

            handleTimeout: () => {
                const state = get();
                state.skipTurn();
            },

            skipTurn: () => {
                set((state) => {
                    const { currentPickIndex, teams, draftHistory } = state;

                    if (currentPickIndex >= 20) return state;

                    const getDraftOrderIndex = (pickIdx: number) => {
                        const r = Math.floor(pickIdx / 5) + 1;
                        const idx = pickIdx % 5;
                        const even = r % 2 === 0;
                        return even ? 4 - idx : idx;
                    };

                    const draftOrderIndex = getDraftOrderIndex(currentPickIndex);
                    const currentTeam = teams.find((t: Team) => t.draftOrderIndex === draftOrderIndex);

                    if (!currentTeam) return state;

                    const snapshot: DraftStateSnapshot = {
                        teams: JSON.parse(JSON.stringify(teams)),
                        players: JSON.parse(JSON.stringify(state.players)),
                        currentRound: state.currentRound,
                        currentPickIndex: state.currentPickIndex,
                    };

                    // Advance Turn (Skip Full Teams)
                    let nextPickIndex = currentPickIndex + 1;
                    const newTeams = [...teams]; // No roster update for skip

                    while (nextPickIndex < 20) {
                        const nextOrderIndex = getDraftOrderIndex(nextPickIndex);
                        const nextTeam = newTeams.find(t => t.draftOrderIndex === nextOrderIndex);

                        const isFull = nextTeam && Object.keys(nextTeam.roster).length === 4;

                        if (isFull) {
                            nextPickIndex++;
                        } else {
                            break;
                        }
                    }

                    const nextRound = Math.floor(nextPickIndex / 5) + 1;

                    // Add "Turn Skipped" log to history (optional, but good for debugging)
                    // We are just pushing the snapshot before the skip

                    return {
                        currentPickIndex: nextPickIndex,
                        currentRound: nextRound > 4 ? 4 : nextRound,
                        draftHistory: [...draftHistory, snapshot],
                        timeLeft: 30,
                    };
                });
            },

            setDraftOrder: (order: string[]) => {
                set((state) => {
                    const newTeams = state.teams.map((team) => ({
                        ...team,
                        draftOrderIndex: order.indexOf(team.id),
                    }));
                    return {
                        teams: newTeams,
                        step: 'DRAFTING',
                        currentRound: 1,
                        currentPickIndex: 0,
                        draftHistory: [],
                        timeLeft: 30,
                    };
                });
            },

            pickPlayer: (playerId: string) => {
                set((state) => {
                    const { currentPickIndex, teams, players, draftHistory } = state;

                    if (currentPickIndex >= 20) return state;

                    const getDraftOrderIndex = (pickIdx: number) => {
                        const r = Math.floor(pickIdx / 5) + 1;
                        const idx = pickIdx % 5;
                        const even = r % 2 === 0;
                        return even ? 4 - idx : idx;
                    };

                    const draftOrderIndex = getDraftOrderIndex(currentPickIndex);
                    const currentTeam = teams.find((t: Team) => t.draftOrderIndex === draftOrderIndex);

                    if (!currentTeam) return state;

                    const player = players.find((p: Player) => p.id === playerId);
                    if (!player || player.isDrafted) return state;

                    if (currentTeam.roster[player.position]) {
                        return state;
                    }

                    // Track Pick Event
                    trackEvent(ANALYTICS_EVENTS.PICK_PLAYER, {
                        player: player.name,
                        position: player.position,
                        team: currentTeam.leaderName,
                        round: state.currentRound,
                        pickIndex: currentPickIndex
                    });

                    const snapshot: DraftStateSnapshot = {
                        teams: JSON.parse(JSON.stringify(teams)),
                        players: JSON.parse(JSON.stringify(players)),
                        currentRound: state.currentRound,
                        currentPickIndex: state.currentPickIndex,
                    };

                    // 1. Pick
                    let newPlayers = players.map((p: Player) =>
                        p.id === playerId ? { ...p, isDrafted: true, draftedBy: currentTeam.id } : p
                    );

                    let newTeams = teams.map((t: Team) =>
                        t.id === currentTeam.id
                            ? { ...t, roster: { ...t.roster, [player.position]: player } }
                            : t
                    );

                    // 2. Auto-Assignment
                    const draftedPlayersInPos = newPlayers.filter(p => p.position === player.position && p.isDrafted);

                    if (draftedPlayersInPos.length === 4) {
                        const lastPlayer = newPlayers.find(p => p.position === player.position && !p.isDrafted);
                        if (lastPlayer) {
                            const targetTeam = newTeams.find(t => !t.roster[player.position]);
                            if (targetTeam) {
                                newPlayers = newPlayers.map(p =>
                                    p.id === lastPlayer.id ? { ...p, isDrafted: true, draftedBy: targetTeam.id } : p
                                );
                                newTeams = newTeams.map(t =>
                                    t.id === targetTeam.id
                                        ? { ...t, roster: { ...t.roster, [player.position]: lastPlayer } }
                                        : t
                                );
                            }
                        }
                    }

                    // 3. Advance Turn (Skip Full Teams)
                    let nextPickIndex = currentPickIndex + 1;

                    while (nextPickIndex < 20) {
                        const nextOrderIndex = getDraftOrderIndex(nextPickIndex);
                        const nextTeam = newTeams.find(t => t.draftOrderIndex === nextOrderIndex);

                        const isFull = nextTeam && Object.keys(nextTeam.roster).length === 4;

                        if (isFull) {
                            nextPickIndex++;
                        } else {
                            break;
                        }
                    }

                    const nextRound = Math.floor(nextPickIndex / 5) + 1;

                    // Track Game Complete
                    if (nextPickIndex >= 20) {
                        trackEvent(ANALYTICS_EVENTS.GAME_COMPLETE);
                    }

                    return {
                        players: newPlayers,
                        teams: newTeams,
                        currentPickIndex: nextPickIndex,
                        currentRound: nextRound > 4 ? 4 : nextRound,
                        draftHistory: [...draftHistory, snapshot],
                        timeLeft: 30,
                    };
                });
            },

            makeAIPick: () => {
                const state = get();
                const { currentPickIndex, teams, players, positionNames } = state;

                if (currentPickIndex >= 20) return;

                const getDraftOrderIndex = (pickIdx: number) => {
                    const r = Math.floor(pickIdx / 5) + 1;
                    const idx = pickIdx % 5;
                    const even = r % 2 === 0;
                    return even ? 4 - idx : idx;
                };

                const draftOrderIndex = getDraftOrderIndex(currentPickIndex);
                const currentTeam = teams.find((t: Team) => t.draftOrderIndex === draftOrderIndex);

                if (!currentTeam) return;

                // AI Permission Check
                if (state.isAIMode && !state.userTeamId) {
                    // Solo AI Mode (Full Auto)
                } else if (state.isAIMode && !state.isCustomMode) {
                    // Solo AI Mode (User plays one team)
                    if (currentTeam.id === state.userTeamId) return;
                } else {
                    // Multiplayer / Custom
                    if (currentTeam.ownerId !== 'AI') return;
                }

                // --- Advanced AI Logic ---
                // Constants (Tunable)
                const U_BASE = 10;
                const U_DROP = 0.8;
                const ALPHA = 1.0; // Rating weight
                // const BETA = 0.5; // Position Fit weight (Not implemented yet)
                // const GAMMA = 0.3; // Captain Pref weight (Not implemented yet)

                // 0. Identify needed roles
                const filledPositions = Object.keys(currentTeam.roster);
                const rolesNeededTeam = positionNames.filter(p => !filledPositions.includes(p));

                if (rolesNeededTeam.length === 0) return;

                // Helper: Find next pick index for this team
                const findNextPickIndex = (teamOrderIdx: number, currentIdx: number) => {
                    for (let i = currentIdx + 1; i < 20; i++) {
                        if (getDraftOrderIndex(i) === teamOrderIdx) {
                            return i;
                        }
                    }
                    return 20; // End of draft
                };

                const nextPickIndex = findNextPickIndex(currentTeam.draftOrderIndex, currentPickIndex);
                const urgency: Record<string, number> = {};

                // 1. Calculate Threat & Dropoff for each role
                rolesNeededTeam.forEach(role => {
                    // Threat Calculation
                    let isThreatened = false;
                    for (let k = currentPickIndex + 1; k < nextPickIndex; k++) {
                        const teamIdxAtK = getDraftOrderIndex(k);
                        const teamAtK = teams.find(t => t.draftOrderIndex === teamIdxAtK);
                        // If the intervening team needs this role, it's a threat
                        if (teamAtK && !teamAtK.roster[role]) {
                            isThreatened = true;
                            break;
                        }
                    }

                    // Dropoff Calculation
                    const candidates = players
                        .filter(p => !p.isDrafted && p.position === role)
                        .sort((a, b) => (b.score || 0) - (a.score || 0));

                    const bestRating = candidates[0]?.score || 0;
                    const secondRating = candidates.length >= 2 ? (candidates[1]?.score || 0) : 0;
                    const dropoff = bestRating - secondRating;

                    if (isThreatened) {
                        urgency[role] = U_BASE + (dropoff * U_DROP);
                    } else {
                        urgency[role] = 0;
                    }
                });

                // 2. Calculate Final Score for each candidate
                let bestPlayer: Player | null = null;
                let bestScore = -Infinity;

                const availablePlayers = players.filter(p => !p.isDrafted && rolesNeededTeam.includes(p.position));

                availablePlayers.forEach(p => {
                    const role = p.position;
                    const roleUrgency = urgency[role] || 0;

                    // Formula: Base(Rating) + Urgency
                    // TODO: Add PositionFit and CaptainPref when data is available
                    const baseScore = (p.score || 0) * ALPHA;
                    const finalScore = baseScore + roleUrgency;

                    if (finalScore > bestScore) {
                        bestScore = finalScore;
                        bestPlayer = p;
                    }
                });

                // 3. Execute Pick
                if (bestPlayer) {
                    state.pickPlayer((bestPlayer as Player).id);
                }
            },

            undo: () => {
                set((state) => {
                    if (state.draftHistory.length === 0) return state;

                    trackEvent(ANALYTICS_EVENTS.UNDO_ACTION);

                    const lastSnapshot = state.draftHistory[state.draftHistory.length - 1];
                    const newHistory = state.draftHistory.slice(0, -1);

                    return {
                        ...state,
                        teams: lastSnapshot.teams,
                        players: lastSnapshot.players,
                        currentRound: lastSnapshot.currentRound,
                        currentPickIndex: lastSnapshot.currentPickIndex,
                        draftHistory: newHistory,
                    };
                });
            },

            resetDraftingState: () => {
                // 1. Deep Copy Players (Fresh State)
                const freshPlayers = JSON.parse(JSON.stringify(POOL_DATA)).map((p: any, index: number) => ({
                    id: `player-${index}`,
                    ...p,
                    isDrafted: false,
                    draftedBy: null,
                }));

                // 2. Deep Reset Teams (Explicit Reconstruction)
                // Re-create teams from constants to ensure no residual data persists
                const freshTeams: Team[] = PRESET_LEADERS.map((name, index) => ({
                    id: `team-${index}`,
                    leaderName: name,
                    roster: {}, // Force clear roster (User's requirement: "Explicitly set all slots to null")
                    draftOrderIndex: -1,
                    ownerId: undefined, // Will be re-assigned by Multiplayer Store
                    disconnectedOwnerName: undefined
                }));

                // 3. Overwrite State
                set({
                    teams: freshTeams,
                    players: freshPlayers,
                    currentPickIndex: 0,
                    draftHistory: [],
                    timeLeft: 30,
                    // Reset Position Names just in case
                    positionNames: Array.from(new Set(POOL_DATA.map(p => p.position))),
                }); // Standard set is sufficient as we are providing fresh references
            },

            resetOrderState: () => {
                set((state) => ({
                    teams: state.teams.map(t => ({ ...t, draftOrderIndex: -1 })),
                }));
            },

            reset: () => {
                set(INITIAL_STATE);
            },

            resetAll: () => {
                trackEvent(ANALYTICS_EVENTS.RESET_DRAFT);
                set({
                    step: 'HOME',
                    teams: [],
                    players: [],
                    positionNames: [],
                    currentRound: 1,
                    currentPickIndex: 0,
                    draftHistory: [],
                    isAIMode: false,
                    userTeamId: null,
                    isCustomMode: false,
                    timeLeft: 30,
                });
            },
        }),
        {
            name: 'draft-storage',
        }
    )
);
