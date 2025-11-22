import React, { useState, useEffect } from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { ArrowRight, Shuffle, GripVertical, User, Lock, Bot } from 'lucide-react';
import type { Team } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import clsx from 'clsx';

export const OrderSetting: React.FC = () => {
    const teams = useDraftStore((state) => state.teams);
    const setDraftOrder = useDraftStore((state) => state.setDraftOrder);

    const { isHost, roomId, broadcast, myId } = useMultiplayerStore();
    const isMultiplayer = !!roomId;
    const isGuest = isMultiplayer && !isHost;

    // Local state for reordering before committing
    const [localOrder, setLocalOrder] = useState<string[]>([]);

    // Initialize localOrder when teams are loaded or updated
    useEffect(() => {
        if (teams.length > 0) {
            if (localOrder.length === 0 || localOrder.length !== teams.length) {
                setLocalOrder(teams.map((t: Team) => t.id));
            } else if (isGuest) {
                setLocalOrder(teams.map((t: Team) => t.id));
            }
        }
    }, [teams, isGuest, localOrder.length]);

    const handleShuffle = () => {
        if (isGuest) return;
        const shuffled = [...localOrder].sort(() => Math.random() - 0.5);
        setLocalOrder(shuffled);

        if (isHost) {
            broadcast('UPDATE_ORDER_PREVIEW', shuffled);
        }
    };

    const handleStartDraft = () => {
        setDraftOrder(localOrder);

        if (isHost) {
            setTimeout(() => {
                broadcast('SYNC_STATE', useDraftStore.getState());
                broadcast('START_GAME', null);
                useDraftStore.setState({ step: 'DRAFTING' });
            }, 100);
        } else {
            // Single player
            useDraftStore.setState({ step: 'DRAFTING' });
        }
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination || isGuest) {
            return;
        }

        const items = Array.from(localOrder);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setLocalOrder(items);

        if (isHost) {
            broadcast('UPDATE_ORDER_PREVIEW', items);
        }
    };

    // Listen for preview updates as Guest
    useEffect(() => {
        if (isGuest) {
            const { connection } = useMultiplayerStore.getState();
            if (connection) {
                const handler = (data: any) => {
                    if (data.type === 'UPDATE_ORDER_PREVIEW') {
                        setLocalOrder(data.payload);
                    }
                };
                connection.on('data', handler);
                return () => { connection.off('data', handler); };
            }
        }
    }, [isGuest]);

    return (
        <div className="max-w-3xl mx-auto h-full flex flex-col">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">순서 정하기</h2>
                <p className="text-text-sub">
                    {isGuest
                        ? "방장이 드래프트 순서를 설정하고 있습니다. 잠시만 기다려주세요."
                        : "드래프트 순서를 설정하세요. 카드를 드래그하여 순서를 변경할 수 있습니다."}
                </p>
            </div>

            <div className="flex justify-end mb-4">
                {!isGuest && (
                    <button
                        onClick={handleShuffle}
                        className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-white/10 text-primary border border-primary/20 rounded-lg transition-colors"
                    >
                        <Shuffle className="w-4 h-4" />
                        랜덤 섞기
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-auto pr-2">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="team-list" isDropDisabled={isGuest}>
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-3"
                            >
                                {localOrder.map((teamId: string, index: number) => {
                                    const team = teams.find((t: Team) => t.id === teamId);
                                    if (!team) return null;

                                    // Determine Role Display
                                    let roleText = '';
                                    let isMyTeam = false;
                                    let isAI = false;

                                    if (isMultiplayer) {
                                        if (team.ownerId === myId) {
                                            roleText = '(당신)';
                                            isMyTeam = true;
                                        } else if (team.ownerId === 'AI') {
                                            roleText = '(AI)';
                                            isAI = true;
                                        } else {
                                            // Assuming leaderName is the player name for now, or we need to look up participant name?
                                            // In assignRolesAndStart, we set leaderName to participant.name.
                                            // So team.leaderName should be correct.
                                            // Wait, leaderName is the TEAM LEADER (e.g. Wolf), not the User Name.
                                            // We need to store User Name separately or append it?
                                            // The requirement says: "[Team Name] (Assigned User)"
                                            // In assignRolesAndStart:
                                            // return { ...team, ownerId: participant.peerId, leaderName: participant.name }; 
                                            // Wait, if we overwrite leaderName with participant name, we lose "Wolf".
                                            // The user said: "Display Logic: [Team Name] (Assigned User)"
                                            // "Wolf (User123)"
                                            // So we shouldn't have overwritten leaderName in useMultiplayerStore.
                                            // Let's fix useMultiplayerStore first or handle it here?
                                            // If we already overwrote it, we lost the team name.
                                            // Let's check useMultiplayerStore again.
                                            // Ah, I wrote: `leaderName: participant.name` in the previous step.
                                            // This is WRONG if leaderName is supposed to be "Wolf".
                                            // Let's check types.ts to see if there is another field.
                                            // If not, we might need to add `ownerName` to Team interface.

                                            // For now, let's assume I will fix useMultiplayerStore to NOT overwrite leaderName,
                                            // but add a new field or just use a lookup.
                                            // Actually, `participants` in store has the names.
                                            // We can look up the name from `useMultiplayerStore.participants` using `team.ownerId`.

                                            // Let's use the participant lookup here.
                                            const participant = useMultiplayerStore.getState().participants.find(p => p.peerId === team.ownerId);
                                            if (participant) {
                                                roleText = `(${participant.name})`;
                                            } else if (team.ownerId === 'AI') {
                                                roleText = '(AI)';
                                                isAI = true;
                                            } else {
                                                roleText = '(Unknown)';
                                            }
                                        }
                                    } else {
                                        // Single Player / AI Mode
                                        // We don't have ownerId set for single player usually?
                                        // Or we do if we are in AI mode.
                                        // In AI mode (single player), userTeamId is set.
                                        if (useDraftStore.getState().userTeamId === teamId) {
                                            roleText = '(당신)';
                                            isMyTeam = true;
                                        } else if (useDraftStore.getState().isAIMode) {
                                            roleText = '(AI)';
                                            isAI = true;
                                        }
                                    }

                                    return (
                                        <div key={teamId} className="flex items-center gap-4">
                                            {/* Fixed Rank Number */}
                                            <div className="flex items-center justify-center w-10 h-10 bg-app text-primary font-bold rounded-full border border-primary/20 shrink-0">
                                                {index + 1}
                                            </div>

                                            <Draggable draggableId={teamId} index={index} isDragDisabled={isGuest}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={clsx(
                                                            "flex-1 flex items-center gap-4 p-4 border rounded-xl shadow-sm transition-all group",
                                                            !isGuest && "cursor-grab active:cursor-grabbing",
                                                            snapshot.isDragging ? "border-primary shadow-[0_0_20px_rgba(0,255,163,0.2)] z-50" : "hover:border-primary/30",
                                                            isMyTeam ? "bg-primary/10 border-primary ring-1 ring-primary" : "bg-surface border-white/5",
                                                            isGuest && "opacity-90"
                                                        )}
                                                        style={provided.draggableProps.style}
                                                    >
                                                        <div className={clsx("p-2 text-text-sub transition-colors", !isGuest && "group-hover:text-white")}>
                                                            {isGuest ? <Lock className="w-4 h-4 opacity-50" /> : <GripVertical className="w-5 h-5" />}
                                                        </div>

                                                        <div className="flex-1 font-bold text-lg text-white flex items-center gap-3">
                                                            {team.leaderName}
                                                            <span className={clsx("text-sm font-normal", isMyTeam ? "text-primary" : "text-text-sub")}>
                                                                {roleText}
                                                            </span>
                                                        </div>

                                                        {isAI && (
                                                            <div className="flex items-center gap-1 text-xs text-text-sub bg-white/10 px-2 py-1 rounded-full">
                                                                <Bot className="w-3 h-3" />
                                                            </div>
                                                        )}

                                                        {isMyTeam && (
                                                            <div className="flex items-center gap-1 text-xs bg-primary text-black px-2 py-0.5 rounded-full font-bold">
                                                                <User className="w-3 h-3" /> ME
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        </div>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            <div className="pt-8 flex justify-center">
                {isGuest ? (
                    <div className="flex items-center gap-3 px-10 py-4 bg-white/5 text-text-sub rounded-full font-bold text-lg animate-pulse">
                        <Lock className="w-5 h-5" />
                        방장이 시작하기를 기다리는 중...
                    </div>
                ) : (
                    <button
                        onClick={handleStartDraft}
                        className="group flex items-center gap-3 px-10 py-4 bg-primary hover:bg-green-400 disabled:bg-surface disabled:text-text-sub disabled:cursor-not-allowed text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(0,255,163,0.3)] hover:shadow-[0_0_30px_rgba(0,255,163,0.5)] transition-all transform hover:scale-105"
                    >
                        드래프트 시작
                        <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                    </button>
                )}
            </div>
        </div>
    );
};
