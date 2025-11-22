import React from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { ArrowLeft, LogOut } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const step = useDraftStore((state) => state.step);
    const setStep = (step: 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING' | 'LOBBY') => useDraftStore.setState({ step });
    const isCustomMode = useDraftStore((state) => state.isCustomMode);
    const resetDraftingState = useDraftStore((state) => state.resetDraftingState);
    const resetOrderState = useDraftStore((state) => state.resetOrderState);

    const { roomId, leaveRoom } = useMultiplayerStore();
    const isMultiplayer = !!roomId;

    const handleHomeClick = () => {
        if (step === 'HOME') return;
        if (window.confirm('홈으로 돌아가시겠습니까? 진행 중인 데이터가 초기화됩니다.')) {
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
        if (window.confirm('정말로 나가시겠습니까? 모든 데이터가 삭제됩니다.')) {
            leaveRoom();
        }
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
                                    이전 단계
                                </button>
                            )}

                            <div className="w-px h-4 bg-white/10"></div>

                            <button
                                onClick={handleExit}
                                className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
                            >
                                <LogOut className="w-4 h-4" />
                                나가기
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 pt-20 pb-8 px-4 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
};
