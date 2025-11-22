import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Papa from 'papaparse';
import type { DraftState, Player, Team, DraftStateSnapshot } from '../types';
import { PRESET_LEADERS, POOL_DATA } from '../constants';

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
                const { currentPickIndex, teams, players } = state;

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

                // CRITICAL FIX: Only allow AI to pick if ownerId is 'AI'
                if (currentTeam.ownerId !== 'AI') return;

                const filledPositions = Object.keys(currentTeam.roster);
                const allPositions = state.positionNames;
                const neededPositions = allPositions.filter(p => !filledPositions.includes(p));

                if (neededPositions.length === 0) return;

                const availablePlayers = players.filter(p => !p.isDrafted && neededPositions.includes(p.position));

                availablePlayers.sort((a, b) => (b.score || 0) - (a.score || 0));

                if (availablePlayers.length > 0) {
                    const bestPlayer = availablePlayers[0];
                    state.pickPlayer(bestPlayer.id);
                }
            },

            undo: () => {
                set((state) => {
                    if (state.draftHistory.length === 0) return state;

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
                set((state) => ({
                    currentRound: 1,
                    currentPickIndex: 0,
                    draftHistory: [],
                    players: state.players.map(p => ({ ...p, isDrafted: false, draftedBy: null })),
                    teams: state.teams.map(t => ({ ...t, roster: {} })),
                }));
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
