import React, { useEffect, useState } from 'react';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { useDraftStore } from '../store/useDraftStore';
import { Copy, Users, Play, ArrowRight } from 'lucide-react';
import { trackEvent, trackError, ANALYTICS_EVENTS } from '../utils/analytics';

export const MultiplayerLobby: React.FC = () => {
    const { roomId, myId, isHost, participants, createRoom, joinRoom } = useMultiplayerStore();
    const loadPresetData = useDraftStore((state) => state.loadPresetData);

    const [joinId, setJoinId] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                // Initialize with a random name for now
                await useMultiplayerStore.getState().initializePeer('Player-' + Math.floor(Math.random() * 1000));
            } catch (error) {
                console.error("Failed to initialize PeerJS:", error);
                trackError(error instanceof Error ? error.message : 'PeerJS Init Failed', 'MultiplayerLobby');
                alert("멀티플레이 연결에 실패했습니다. 페이지를 새로고침 해주세요.");
            }
        };
        init();
        trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: 'Lobby' });
    }, []);

    const handleCreate = () => {
        trackEvent(ANALYTICS_EVENTS.CREATE_ROOM);
        setIsCreating(true);
        loadPresetData(); // Load data first
        createRoom();
    };

    const handleJoin = () => {
        if (!joinId) return;
        trackEvent(ANALYTICS_EVENTS.JOIN_ROOM);
        joinRoom(joinId);
    };

    const handleStartGame = () => {
        trackEvent('Start Multiplayer Game', { participants: participants.length });
        useMultiplayerStore.getState().assignRolesAndStart();
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        alert('방 ID가 복사되었습니다!');
    };

    if (!roomId && !useMultiplayerStore.getState().connection) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-8">
                <h1 className="text-4xl font-bold text-white">멀티플레이 로비</h1>

                <div className="flex gap-8">
                    {/* Create Room */}
                    <div className="bg-surface p-8 rounded-xl border border-white/10 flex flex-col items-center gap-4 w-80">
                        <h2 className="text-xl font-bold text-primary">방 만들기</h2>
                        <p className="text-text-sub text-center text-sm">
                            방장이 되어 다른 유저를 초대하세요.
                        </p>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-green-400 transition-colors"
                        >
                            {isCreating ? '생성 중...' : '방 만들기'}
                        </button>
                    </div>

                    {/* Join Room */}
                    <div className="bg-surface p-8 rounded-xl border border-white/10 flex flex-col items-center gap-4 w-80">
                        <h2 className="text-xl font-bold text-white">방 참가하기</h2>
                        <p className="text-text-sub text-center text-sm">
                            공유받은 방 ID를 입력하여 참가하세요.
                        </p>
                        <div className="w-full flex gap-2">
                            <input
                                type="text"
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                                placeholder="방 ID 입력"
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none"
                            />
                            <button
                                onClick={handleJoin}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <ArrowRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="bg-surface p-8 rounded-xl border border-white/10 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary" />
                        대기실
                    </h2>
                    {isHost && (
                        <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-lg border border-white/5">
                            <span className="text-text-sub text-sm">Room ID:</span>
                            <span className="text-white font-mono">{roomId}</span>
                            <button onClick={copyRoomId} className="ml-2 text-primary hover:text-white transition-colors">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-4 mb-8">
                    <h3 className="text-sm font-bold text-text-sub uppercase tracking-wider">참가자 목록 ({participants.length})</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {participants.map((p) => (
                            <div key={p.peerId} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-primary' : 'bg-red-500'}`}></div>
                                    <span className="text-white font-medium">
                                        {p.name} {p.peerId === myId && '(나)'} {p.peerId === roomId && '(방장)'}
                                    </span>
                                </div>
                                <span className="text-xs text-text-sub font-mono opacity-50">{p.peerId.slice(0, 8)}...</span>
                            </div>
                        ))}
                    </div>
                </div>

                {isHost ? (
                    <button
                        onClick={handleStartGame}
                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <Play className="w-5 h-5" />
                        게임 시작
                    </button>
                ) : (
                    <div className="w-full py-4 bg-white/5 text-text-sub font-medium rounded-xl text-center animate-pulse">
                        방장이 게임을 시작하기를 기다리고 있습니다...
                    </div>
                )}
            </div>
        </div>
    );
};
