import { create } from 'zustand';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { useDraftStore } from './useDraftStore';

interface Participant {
    peerId: string;
    name: string;
    isConnected: boolean;
    lastHeartbeat: number;
}

interface MultiplayerState {
    peer: Peer | null;
    isHost: boolean;
    myId: string;
    roomId: string;
    connections: DataConnection[]; // For Host
    connection: DataConnection | null; // For Guest
    participants: Participant[];
    isConnecting: boolean; // New State

    initializePeer: (name: string) => Promise<string>;
    createRoom: () => void;
    joinRoom: (hostId: string) => void;
    broadcast: (type: string, payload: any) => void;
    sendToHost: (type: string, payload: any) => void;
    handleHeartbeat: () => void;
    assignRolesAndStart: () => void;
    reset: () => void;
    leaveRoom: () => void;
    returnToLobby: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
    peer: null,
    isHost: false,
    myId: '',
    roomId: '',
    connections: [],
    connection: null,
    participants: [],
    isConnecting: false, // Initial State

    initializePeer: async (name: string) => {
        // Singleton Guard: Prevent double initialization
        if (get().peer || get().isConnecting) {
            // console.log('Peer already initialized or connecting. Skipping.');
            return get().myId;
        }

        set({ isConnecting: true }); // Start loading

        try {
            // @ts-ignore
            const PeerClass = Peer.default || Peer;
            const peer = new PeerClass();

            return new Promise((resolve, reject) => {
                peer.on('open', (id: string) => {
                    // console.log('My Peer ID is: ' + id);
                    set({
                        peer,
                        myId: id,
                        participants: [{ peerId: id, name, isConnected: true, lastHeartbeat: Date.now() }],
                        isConnecting: false // Finish loading
                    });
                    resolve(id);
                });

                peer.on('error', (err: any) => {
                    console.error('PeerJS Error:', err);
                    set({ isConnecting: false }); // Stop loading on error
                    reject(err);
                });
            });
        } catch (e) {
            console.error("Error instantiating Peer:", e);
            set({ isConnecting: false });
            throw e;
        }
    },

    createRoom: () => {
        const { peer, myId } = get();
        // Safety Guard: Prevent execution if not ready
        if (!peer || !myId) {
            console.warn('Cannot create room: Peer not ready');
            return;
        }

        set({ isHost: true, roomId: myId });

        // Ensure we are in the Lobby
        useDraftStore.setState({ step: 'LOBBY' });

        peer.on('connection', (conn: DataConnection) => {
            // console.log('Incoming connection from:', conn.peer);

            // Room Capacity Check (Max 5)
            if (get().participants.length >= 5) {
                conn.on('open', () => {
                    conn.send({ type: 'ERROR', payload: '방이 만원입니다 (최대 5명).' });
                    setTimeout(() => conn.close(), 500);
                });
                return;
            }

            conn.on('open', () => {
                // Add to connections
                set((state) => ({ connections: [...state.connections, conn] }));

                // Send initial state (Sanitized)
                const draftState = useDraftStore.getState().getSerializableState();
                conn.send({ type: 'SYNC_STATE', payload: draftState });

                // Setup data listener
                conn.on('data', (data: any) => {
                    const { type, payload } = data;

                    if (type === 'JOIN_REQUEST') {
                        const newParticipant = {
                            peerId: conn.peer,
                            name: payload.name,
                            isConnected: true,
                            lastHeartbeat: Date.now()
                        };

                        set((state) => {
                            const updatedParticipants = [...state.participants, newParticipant];
                            // Broadcast updated participants list
                            get().broadcast('UPDATE_PARTICIPANTS', updatedParticipants);
                            return { participants: updatedParticipants };
                        });
                    } else if (type === 'LEAVE') {
                        // console.log('Participant left:', conn.peer);
                        // Remove participant
                        set((state) => {
                            const updatedParticipants = state.participants.filter(p => p.peerId !== conn.peer);
                            get().broadcast('UPDATE_PARTICIPANTS', updatedParticipants);

                            // If game is running, convert their team to AI
                            const { teams } = useDraftStore.getState();
                            const teamIndex = teams.findIndex(t => t.ownerId === conn.peer);
                            if (teamIndex !== -1) {
                                const newTeams = [...teams];
                                const disconnectedParticipant = state.participants.find(p => p.peerId === conn.peer);
                                newTeams[teamIndex] = {
                                    ...newTeams[teamIndex],
                                    ownerId: 'AI',
                                    disconnectedOwnerName: disconnectedParticipant?.name
                                };
                                useDraftStore.setState({ teams: newTeams });
                                get().broadcast('SYNC_STATE', useDraftStore.getState().getSerializableState());
                            }

                            return { participants: updatedParticipants };
                        });
                        conn.close();
                    } else if (type === 'REQUEST_PICK') {
                        // Handle pick request
                        const { pickPlayer } = useDraftStore.getState();
                        pickPlayer(payload);
                        setTimeout(() => {
                            const newState = useDraftStore.getState().getSerializableState();
                            get().broadcast('SYNC_STATE', newState);
                        }, 100);
                    } else if (type === 'PONG') {
                        set((state) => ({
                            participants: state.participants.map(p =>
                                p.peerId === conn.peer ? { ...p, lastHeartbeat: Date.now() } : p
                            )
                        }));
                    }
                });

                conn.on('close', () => {
                    // console.log('Connection closed:', conn.peer);
                    // Handle unexpected disconnection (same as LEAVE but triggered by close)
                    // We rely on Heartbeat for timeouts, but this handles explicit close events
                    const { participants } = get();
                    if (participants.some(p => p.peerId === conn.peer)) {
                        set((state) => {
                            const updatedParticipants = state.participants.filter(p => p.peerId !== conn.peer);
                            get().broadcast('UPDATE_PARTICIPANTS', updatedParticipants);
                            return { participants: updatedParticipants };
                        });
                    }
                });
            });
        });

        // Heartbeat Loop (1s Ping, 3s Timeout)
        const intervalId = setInterval(() => {
            const { participants, broadcast } = get();

            // 1. Send PING
            broadcast('PING', null);

            // 2. Check Timeouts (3s)
            const now = Date.now();
            const timeoutThreshold = 3000;

            const activeParticipants = participants.filter(p => {
                if (p.peerId === get().myId) return true; // Self is always active
                return (now - p.lastHeartbeat) < timeoutThreshold;
            });

            if (activeParticipants.length !== participants.length) {
                // console.log('Removing timed out participants');
                set({ participants: activeParticipants });
                broadcast('UPDATE_PARTICIPANTS', activeParticipants);

                // Convert dropped players to AI
                const { teams } = useDraftStore.getState();
                let teamsUpdated = false;
                const newTeams = teams.map(team => {
                    // If team owner is not in active participants (and not AI), convert to AI
                    if (team.ownerId !== 'AI' && !activeParticipants.some(p => p.peerId === team.ownerId)) {
                        teamsUpdated = true;
                        const disconnectedParticipant = participants.find(p => p.peerId === team.ownerId);
                        return {
                            ...team,
                            ownerId: 'AI',
                            disconnectedOwnerName: disconnectedParticipant?.name
                        };
                    }
                    return team;
                });

                if (teamsUpdated) {
                    useDraftStore.setState({ teams: newTeams });
                    broadcast('SYNC_STATE', useDraftStore.getState().getSerializableState());
                }
            }
        }, 1000);

        // Timer Loop (1s) - Host Only
        const timerIntervalId = setInterval(() => {
            const { step, timeLeft, setTimeLeft, handleTimeout, getSerializableState } = useDraftStore.getState();
            const { broadcast } = get();

            if (step === 'DRAFTING' && timeLeft > 0) {
                setTimeLeft(timeLeft - 1);
                // Broadcast Timer Update (Optimized: Only send time)
                broadcast('SYNC_TIMER', timeLeft - 1);
            } else if (step === 'DRAFTING' && timeLeft === 0) {
                handleTimeout();
                // Sync full state after timeout pick
                broadcast('SYNC_STATE', getSerializableState());
            }
        }, 1000);

        // Store interval IDs for cleanup
        // @ts-ignore
        get().heartbeatInterval = intervalId;
        // @ts-ignore
        get().timerInterval = timerIntervalId;

        // Store interval ID for cleanup if needed
        // @ts-ignore
        get().heartbeatInterval = intervalId;
    },

    joinRoom: (hostId: string) => {
        const { peer, participants } = get();
        if (!peer) return;

        const conn = peer.connect(hostId);
        set({ connection: conn, roomId: hostId, isHost: false });

        conn.on('open', () => {
            // console.log('Connected to host');

            // Send Join Request
            const myName = participants[0]?.name || 'Guest';
            conn.send({ type: 'JOIN_REQUEST', payload: { name: myName } });

            conn.on('data', (data: any) => {
                const { type, payload } = data;

                if (type === 'SYNC_STATE') {
                    useDraftStore.getState().syncState(payload);
                } else if (type === 'UPDATE_PARTICIPANTS') {
                    set({ participants: payload });
                } else if (type === 'PING') {
                    conn.send({ type: 'PONG', payload: null });
                } else if (type === 'START_GAME') {
                    useDraftStore.setState({ step: 'ORDER_SETTING' }); // Or whatever the host decides
                } else if (type === 'ROOM_CLOSED') {
                    alert('방장이 방을 없앴습니다.');
                    get().reset();
                    useDraftStore.getState().resetAll();
                } else if (type === 'ERROR') {
                    alert(payload);
                    get().reset();
                    useDraftStore.getState().resetAll();
                } else if (type === 'SYNC_TIMER') {
                    useDraftStore.getState().setTimeLeft(payload);
                }
            });
        });

        conn.on('close', () => {
            // If connection closes unexpectedly and we didn't initiate it (e.g. host crash)
            // We might want to alert or just reset. 
            // For now, let's assume ROOM_CLOSED handles the graceful case.
            // console.log('Connection to host closed');
        });
    },

    leaveRoom: () => {
        const { isHost, sendToHost, broadcast, reset } = get();

        if (isHost) {
            // Host leaving: Notify all guests
            broadcast('ROOM_CLOSED', null);
        } else {
            // Guest leaving: Notify host
            sendToHost('LEAVE', null);
        }

        // Cleanup local state
        reset();
        useDraftStore.getState().resetAll();
    },

    returnToLobby: () => {
        const { isHost, broadcast } = get();
        if (!isHost) return;

        // Reset drafting state but keep teams/participants if desired? 
        // User said "resetDraftingState" and set step to 'LOBBY'.
        // Usually this implies keeping the room together.

        // We need a way to reset just the game part, not the room.
        // useDraftStore doesn't have a "resetGameOnly" but `resetDraftingState` resets picks.
        // We also need to reset `currentRound`, `currentPickIndex`, `draftHistory`.

        // Use the new Deep Reset action to ensure clean state
        useDraftStore.getState().resetDraftingState();

        // Then set step to LOBBY
        useDraftStore.setState({ step: 'LOBBY' });

        // Broadcast the new state
        const newState = useDraftStore.getState().getSerializableState();
        broadcast('SYNC_STATE', newState);
    },

    broadcast: (type: string, payload: any) => {
        const { connections } = get();
        // Sanitize payload if it looks like state
        const sanitizedPayload = JSON.parse(JSON.stringify(payload));

        connections.forEach(conn => {
            if (conn.open) {
                conn.send({ type, payload: sanitizedPayload });
            }
        });
    },

    sendToHost: (type: string, payload: any) => {
        const { connection } = get();
        const sanitizedPayload = JSON.parse(JSON.stringify(payload));

        if (connection && connection.open) {
            connection.send({ type, payload: sanitizedPayload });
        }
    },

    handleHeartbeat: () => {
        // Implemented in createRoom for Host
    },

    assignRolesAndStart: () => {
        const { participants, broadcast } = get();
        const { teams } = useDraftStore.getState();

        // 1. Shuffle Teams (Randomize Draft Order/Characters)
        const shuffledTeams = [...teams];
        for (let i = shuffledTeams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
        }

        // 2. Shuffle Participants (Randomize Who Gets Which Slot)
        const shuffledParticipants = [...participants];
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }

        // 3. Assign Roles (1:1 Mapping of Shuffled Teams <-> Shuffled Participants)
        const newTeams = shuffledTeams.map((team, index) => {
            const participant = shuffledParticipants[index];
            if (participant) {
                return {
                    ...team,
                    ownerId: participant.peerId,
                    // leaderName: participant.name // REMOVED: Keep original team name
                };
            } else {
                // AI Auto-fill
                return { ...team, ownerId: 'AI' };
            }
        });

        // 3. Update Local State
        useDraftStore.setState({
            teams: newTeams,
            step: 'ORDER_SETTING',
            isAIMode: true // Enable AI mode for auto-filled teams
        });

        // 4. Immediate Broadcast (Fix Delay)
        // Broadcast Sync immediately after state update
        const stateToSync = useDraftStore.getState().getSerializableState();
        broadcast('SYNC_STATE', stateToSync);

        // Broadcast Start Event immediately
        broadcast('START_GAME', null);
    },

    reset: () => {
        const { peer, connections, connection } = get();
        // @ts-ignore
        const intervalId = get().heartbeatInterval;
        // @ts-ignore
        const timerIntervalId = get().timerInterval;
        if (intervalId) clearInterval(intervalId);
        if (timerIntervalId) clearInterval(timerIntervalId);

        connections.forEach(c => c.close());
        if (connection) connection.close();
        if (peer) peer.destroy();

        set({
            peer: null,
            connections: [],
            connection: null,
            participants: [],
            roomId: '',
            isHost: false,
            myId: '', // Clear myId as well to ensure fresh start
            isConnecting: false // Reset loading state
        });
    }
}));
