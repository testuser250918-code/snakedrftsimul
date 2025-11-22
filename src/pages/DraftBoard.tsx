import React, { useEffect } from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { PlayerPool } from './components/PlayerPool';
import { TeamList } from './components/TeamList';
import { Undo } from 'lucide-react';
import type { Team } from '../types';

export const DraftBoard: React.FC = () => {
    const undo = useDraftStore((state) => state.undo);
    const currentRound = useDraftStore((state) => state.currentRound);
    const currentPickIndex = useDraftStore((state) => state.currentPickIndex);
    const draftHistory = useDraftStore((state) => state.draftHistory);
    const teams = useDraftStore((state) => state.teams);
    const players = useDraftStore((state) => state.players);
    const isAIMode = useDraftStore((state) => state.isAIMode);
    const userTeamId = useDraftStore((state) => state.userTeamId);
    const makeAIPick = useDraftStore((state) => state.makeAIPick);
    const timeLeft = useDraftStore((state) => state.timeLeft);

    const { isHost, roomId, broadcast } = useMultiplayerStore();
    const isMultiplayer = !!roomId;

    // Calculate current active team name
    const getDraftOrderIndex = (pickIdx: number) => {
        const r = Math.floor(pickIdx / 5) + 1;
        const idx = pickIdx % 5;
        const even = r % 2 === 0;
        return even ? 4 - idx : idx;
    };

    const draftOrderIndex = getDraftOrderIndex(currentPickIndex);
    const currentTeam = teams.find((t: Team) => t.draftOrderIndex === draftOrderIndex);

    // Total Pick Count: Count actual drafted players
    const totalDrafted = players.filter(p => p.isDrafted).length;
    const isDraftComplete = totalDrafted >= 20;

    // Turn Logic
    const isMyTurn = isMultiplayer
        ? currentTeam?.ownerId === useMultiplayerStore.getState().myId
        : (isAIMode ? currentTeam?.id === userTeamId : true);

    // Debug Info
    useEffect(() => {
        if (isMultiplayer) {
            console.log('My ID:', useMultiplayerStore.getState().myId);
            console.log('Current Team Owner:', currentTeam?.ownerId);
            console.log('Is My Turn:', isMyTurn);
        }
    }, [currentTeam, isMultiplayer, isMyTurn]);

    const isAITurn = isMultiplayer
        ? (currentTeam?.ownerId === 'AI' && !isDraftComplete)
        : (isAIMode && !isDraftComplete && currentTeam && currentTeam.id !== userTeamId);

    // Local Timer Logic (Solo AI Mode)
    useEffect(() => {
        if (isAIMode && !isMultiplayer && !isDraftComplete) {
            const timer = setInterval(() => {
                const { timeLeft, setTimeLeft, skipTurn } = useDraftStore.getState();
                if (timeLeft > 0) {
                    setTimeLeft(timeLeft - 1);
                } else {
                    skipTurn();
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isAIMode, isMultiplayer, isDraftComplete, currentPickIndex]); // Reset on pick change (handled by store resetTimeLeft usually, but here we rely on store state)

    // Reset Timer on Pick Change (Local)
    useEffect(() => {
        if (isAIMode && !isMultiplayer) {
            useDraftStore.getState().setTimeLeft(30);
        }
    }, [currentPickIndex, isAIMode, isMultiplayer]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (isAITurn) {
            // AI Protection: Double check ownerId is 'AI' ONLY for Multiplayer
            if (isMultiplayer && currentTeam?.ownerId !== 'AI') return;

            // Delay for AI "thinking" effect (Debounced)
            timeoutId = setTimeout(() => {
                makeAIPick();
                if (isHost) {
                    // Broadcast AI pick result
                    // makeAIPick updates store, so we broadcast state
                    setTimeout(() => broadcast('SYNC_STATE', useDraftStore.getState()), 50);
                }
            }, 1000); // Reduced to 1s as per requirement
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isAITurn, currentPickIndex, makeAIPick, isHost, broadcast, isDraftComplete, currentTeam, isMultiplayer]);

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
            {/* Top Bar: Status & Controls */}
            <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-white/5 shadow-lg shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-xs text-text-sub uppercase tracking-wider font-semibold">라운드 (Round)</span>
                        <span className="text-2xl font-bold text-white">{currentRound > 4 ? '종료' : currentRound} / 4</span>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-sub uppercase tracking-wider font-semibold">전체 픽 (Total Pick)</span>
                        <span className="text-2xl font-bold text-white">{totalDrafted} / 20</span>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-sub uppercase tracking-wider font-semibold">현재 순서 (Current Turn)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-primary animate-pulse">
                                {isDraftComplete ? '드래프트 완료!' : (
                                    <>
                                        {currentTeam?.leaderName}
                                        <span className="ml-1">님의 차례</span>
                                    </>
                                )}
                            </span>
                            {!isDraftComplete && (
                                <span className="text-sm text-text-sub ml-2">
                                    {isMyTurn ? '당신의 차례입니다!' : '상대가 선택 중...'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {/* Timer Display - Render ONLY if Multiplayer or AI Mode */}
                {(isMultiplayer || isAIMode) && !isDraftComplete && (
                    <div className="flex flex-col items-end min-w-[80px]">
                        <span className="text-xs text-text-sub uppercase tracking-wider font-semibold">남은 시간</span>
                        <div className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                            {timeLeft}s
                        </div>
                    </div>
                )}
                {/* Undo / Previous - Render ONLY if NOT Multiplayer */}
                {!isMultiplayer && (
                    <div className="flex items-center gap-3 justify-end ">
                        <button
                            onClick={undo}
                            disabled={draftHistory.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors border border-white/5"
                        >
                            <Undo className="w-4 h-4" />
                            되돌리기
                        </button>
                    </div>
                )}
            </div>
            {/* Main Content: Split View */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* Left: Player Pool (7 cols) */}
                <div className={`lg:col-span-7 h-full min-h-0 ${(!isMyTurn && !isDraftComplete) ? 'pointer-events-none opacity-80' : ''}`}>
                    <PlayerPool />
                </div>

                {/* Right: Team Boards (5 cols) */}
                <div className="lg:col-span-5 h-full min-h-0">
                    <TeamList />
                </div>
            </div>
        </div>
    );
};
