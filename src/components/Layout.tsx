import React from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { ArrowLeft, LogOut, Users } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const step = useDraftStore((state) => state.step);
    const setStep = (step: 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING' | 'LOBBY') => useDraftStore.setState({ step });
    const isCustomMode = useDraftStore((state) => state.isCustomMode);
    const resetDraftingState = useDraftStore((state) => state.resetDraftingState);
    const resetOrderState = useDraftStore((state) => state.resetOrderState);
    const currentPickIndex = useDraftStore((state) => state.currentPickIndex);

    const { roomId, leaveRoom, isHost } = useMultiplayerStore();
    const isMultiplayer = !!roomId;
    const isDraftComplete = step === 'DRAFTING' && currentPickIndex >= 20;

    const handleHomeClick = () => {
        if (step === 'HOME') return;

        let message = '진행 중인 드래프트가 초기화됩니다. 홈으로 이동하시겠습니까?';

        if (isMultiplayer || step === 'LOBBY') {
            if (step === 'LOBBY' && !isMultiplayer) message = '멀티플레이를 중단하시겠습니까?';
            else {
                if (isHost) {
                    message = '멀티플레이를 중단하시겠습니까?\n방장이 나가면 방이 완전히 삭제됩니다.';
                } else {
                    message = '멀티플레이를 중단하시겠습니까?\n나가면 내 자리는 AI로 대체됩니다.';
                }
            }
        }

        if (window.confirm(message)) {
            leaveRoom();
        }
    };

    const handleBack = () => {
        if (step === 'ORDER_SETTING') {
            if (window.confirm('입력 단계로 돌아가시겠습니까? 설정한 순서가 초기화됩니다.')) {
                resetOrderState();
                setStep('INPUT');
            }
        } else if (step === 'DRAFTING') {
            if (window.confirm('순서 정하기 단계로 돌아가시겠습니까? 진행된 드래프트 내용이 초기화됩니다.')) {
                resetDraftingState();
                setStep('ORDER_SETTING');
            }
        }
    };

    const handleExit = () => {
        // Reuse the smart logic from handleHomeClick for consistency
        handleHomeClick();
    };

    return (
        <div className="min-h-screen bg-app text-text-main font-sans selection:bg-primary selection:text-black flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-surface bg-surface/50 backdrop-blur-md fixed top-0 w-full z-50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    {/* Left: Logo / Home Link */}
                    <button
                        onClick={handleHomeClick}
                        className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity"
                    >
                        <span className="text-primary">SNAKE</span> DRAFT
                    </button>

                    {/* Right: Navigation Controls */}
                    {step !== 'HOME' && (
                        <div className="flex items-center gap-4">
                            {/* Back Button: Show only if Custom Mode (for Order Setting) OR if Drafting (always allow back to Order) */}
                            {!isMultiplayer && (step === 'DRAFTING' || (step === 'ORDER_SETTING' && isCustomMode)) && (
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-sm font-medium text-text-sub hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="ml-2">
                                        이전 단계
                                    </span>
                                </button>
                            )}

                            <div className="w-px h-4 bg-white/10"></div>

                            <div className="flex gap-2">
                                {/* Return to Lobby - Render ONLY if Multiplayer Host AND Draft Complete */}
                                {isMultiplayer && isHost && isDraftComplete && (
                                    <button
                                        onClick={() => useMultiplayerStore.getState().returnToLobby()}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg transition-colors text-sm shadow-[0_0_15px_rgba(0,255,163,0.3)] hover:shadow-[0_0_25px_rgba(0,255,163,0.5)]"
                                    >
                                        <Users className="w-4 h-4" />
                                        <span className="hidden sm:inline ml-2">
                                            대기실로 이동
                                        </span>
                                    </button>
                                )}

                                <button
                                    onClick={handleExit}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-500/20 text-text-sub hover:text-red-500 rounded-lg transition-colors text-sm"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline ml-2">
                                        나가기
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col pt-20 pb-8 px-4 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
};
