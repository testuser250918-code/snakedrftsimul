import React from 'react';
import { useDraftStore } from '../../store/useDraftStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import clsx from 'clsx';
import { Shield, Trees, Wand2, Crosshair, Heart } from 'lucide-react';
import type { Team } from '../../types';

export const TeamList: React.FC = () => {
    const teams = useDraftStore((state) => state.teams);
    const currentPickIndex = useDraftStore((state) => state.currentPickIndex);
    const positionNames = useDraftStore((state) => state.positionNames);
    const isAIMode = useDraftStore((state) => state.isAIMode);
    const userTeamId = useDraftStore((state) => state.userTeamId);

    const { roomId, myId } = useMultiplayerStore();
    const isMultiplayer = !!roomId;

    // Calculate current active team
    const round = Math.floor(currentPickIndex / 5) + 1;
    const indexInRound = currentPickIndex % 5;
    const isEvenRound = round % 2 === 0;
    const draftOrderIndex = isEvenRound ? 4 - indexInRound : indexInRound;

    // Sort teams by draft order index for display
    const sortedTeams = [...teams].sort((a: Team, b: Team) => a.draftOrderIndex - b.draftOrderIndex);

    return (
        <div className="flex flex-col gap-3 h-full overflow-auto pr-2">
            {sortedTeams.map((team: Team) => {
                const isActive = team.draftOrderIndex === draftOrderIndex && currentPickIndex < 20;
                const isUserTeam = isMultiplayer ? team.ownerId === myId : team.id === userTeamId;

                return (
                    <div
                        key={team.id}
                        className={clsx(
                            "rounded-xl border p-3 transition-all duration-300",
                            isActive
                                ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,255,163,0.2)]"
                                : "bg-surface border-white/5"
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                                    isActive ? "bg-primary text-black" : "bg-white/10 text-text-sub"
                                )}>
                                    {team.draftOrderIndex + 1}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={clsx(
                                        "font-bold text-lg",
                                        isActive ? "text-white" : "text-text-sub"
                                    )}>
                                        {team.leaderName}
                                    </span>
                                    {isMultiplayer ? (
                                        team.ownerId === 'AI' ? (
                                            team.disconnectedOwnerName ? (
                                                <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                                                    <span className="line-through text-text-sub/50">{team.disconnectedOwnerName}</span>
                                                    (AI)
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-text-sub/50">
                                                    (AI)
                                                </span>
                                            )
                                        ) : isUserTeam ? (
                                            <span className="text-xs font-bold text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                                                (당신)
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-text-sub/50">
                                                (상대)
                                            </span>
                                        )
                                    ) : (
                                        isAIMode && (
                                            isUserTeam ? (
                                                <span className="text-xs font-bold text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                                                    (당신)
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-text-sub/50">
                                                    (A.I)
                                                </span>
                                            )
                                        )
                                    )}
                                </div>
                            </div>
                            {isActive && (
                                <span className="text-xs font-bold text-primary animate-pulse px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
                                    PICKING NOW
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {positionNames.map((pos: string) => {
                                const player = team.roster[pos];

                                return (
                                    <div
                                        key={pos}
                                        className={clsx(
                                            "flex flex-col items-center justify-center p-2 rounded-lg border text-center h-16 transition-colors",
                                            player
                                                ? "bg-white/10 border-white/10"
                                                : "bg-app/50 border-white/5 border-dashed"
                                        )}
                                    >
                                        {player ? (
                                            <>
                                                <span className="text-xs font-bold text-white truncate w-full" title={player.name}>
                                                    {player.name}
                                                </span>
                                                <span className="text-[10px] text-primary mt-0.5">
                                                    {pos}
                                                </span>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center opacity-30">
                                                {/* Role Icons */}
                                                {pos === 'TOP' && <Shield className="w-4 h-4 text-text-sub mb-1" />}
                                                {pos === 'JUNGLE' && <Trees className="w-4 h-4 text-text-sub mb-1" />}
                                                {pos === 'MID' && <Wand2 className="w-4 h-4 text-text-sub mb-1" />}
                                                {pos === 'BOT' && <Crosshair className="w-4 h-4 text-text-sub mb-1" />}
                                                {pos === 'SUP' && <Heart className="w-4 h-4 text-text-sub mb-1" />}
                                                <span className="text-[9px] text-text-sub truncate max-w-[60px]">{pos}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
