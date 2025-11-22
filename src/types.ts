export type Position = string;

export interface Player {
    id: string;
    name: string;
    position: Position;
    isDrafted: boolean;
    draftedBy: string | null;
    score?: number;
    tier?: string;
}

export interface Team {
    id: string;
    leaderName: string;
    roster: Record<string, Player>;
    draftOrderIndex: number;
    ownerId?: string; // Peer ID of the user controlling this team
    disconnectedOwnerName?: string; // Name of the user who disconnected
}

export interface DraftStateSnapshot {
    teams: Team[];
    players: Player[];
    currentRound: number;
    currentPickIndex: number;
}

export interface DraftState {
    step: 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING' | 'LOBBY';
    teams: Team[];
    players: Player[];
    positionNames: string[];
    currentRound: number;
    currentPickIndex: number;
    draftHistory: DraftStateSnapshot[];

    uploadData: (csv: string) => void;
    setDraftOrder: (order: string[]) => void;
    pickPlayer: (playerId: string) => void;
    undo: () => void;
    reset: () => void;
}
