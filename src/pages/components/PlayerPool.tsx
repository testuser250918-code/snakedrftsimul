import React from 'react';
import { useDraftStore } from '../../store/useDraftStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import clsx from 'clsx';
import type { Team, Player } from '../../types';

export const PlayerPool: React.FC = () => {
    const players = useDraftStore((state) => state.players);
    const pickPlayer = useDraftStore((state) => state.pickPlayer);
    const currentPickIndex = useDraftStore((state) => state.currentPickIndex);
    const teams = useDraftStore((state) => state.teams);
    const positionNames = useDraftStore((state) => state.positionNames);

    const { isHost, roomId, sendToHost, broadcast } = useMultiplayerStore();
    const isMultiplayer = !!roomId;

    // Determine current active team to check for position conflicts
    const round = Math.floor(currentPickIndex / 5) + 1;
    const indexInRound = currentPickIndex % 5;
    const isEvenRound = round % 2 === 0;
    const draftOrderIndex = isEvenRound ? 4 - indexInRound : indexInRound;
    const currentTeam = teams.find((t: Team) => t.draftOrderIndex === draftOrderIndex);

    const handlePick = (playerId: string) => {
        if (isMultiplayer) {
            if (isHost) {
                pickPlayer(playerId);
                // Broadcast state update
                setTimeout(() => broadcast('SYNC_STATE', useDraftStore.getState()), 50);
            } else {
                // Guest: Send request to host
                sendToHost('REQUEST_PICK', playerId);
            }
        } else {
            pickPlayer(playerId);
        }
    };

    return (
        <div className="bg-surface border border-white/5 rounded-xl p-4 h-full overflow-auto shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4 sticky top-0 bg-surface/95 p-2 rounded-lg backdrop-blur-sm z-10 border-b border-white/5">
                대기 중인 선수 (Player Pool)
            </h3>

            <div className="space-y-6">
                {positionNames.map((pos: string) => {
                    const positionPlayers = players.filter((p: Player) => p.position === pos);
                    const isPositionFilled = currentTeam?.roster[pos] !== undefined;

                    return (
                        <div key={pos} className="space-y-2">
                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider px-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                {pos}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {positionPlayers.map((player: Player) => {
                                    const isDisabled = player.isDrafted || isPositionFilled || currentPickIndex >= 20;

                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => handlePick(player.id)}
                                            disabled={isDisabled}
                                            className={clsx(
                                                "h-36 p-3 rounded-lg text-sm font-medium transition-all duration-200 border text-left relative overflow-hidden group flex flex-col justify-between",
                                                player.isDrafted
                                                    ? "bg-neutral-900 border-white/5 text-text-sub/30 cursor-not-allowed"
                                                    : isDisabled
                                                        ? "bg-surface border-white/5 text-text-sub/50 cursor-not-allowed opacity-60"
                                                        : "bg-white/5 text-white border-white/10 hover:bg-primary hover:text-black hover:border-primary hover:shadow-[0_0_15px_rgba(0,255,163,0.4)] hover:-translate-y-0.5"
                                            )}
                                        >
                                            <div className="w-full">
                                                <div className="text-[10px] opacity-70 mb-1 uppercase tracking-wider">{player.position}</div>
                                                <div className="truncate font-bold text-lg leading-tight">{player.name}</div>
                                            </div>

                                            <div className="w-full h-4 mt-2">
                                                {player.isDrafted ? (
                                                    <div className="text-[10px] text-text-sub/50 truncate">
                                                        Picked by {teams.find((t: Team) => t.id === player.draftedBy)?.leaderName}
                                                    </div>
                                                ) : (
                                                    <div className="h-full"></div> // Spacer to prevent layout shift
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
