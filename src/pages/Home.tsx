import React from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { Play, Bot, Swords } from 'lucide-react';

export const Home: React.FC = () => {
    const setStep = (step: 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING' | 'LOBBY') => useDraftStore.setState({ step });
    const loadPresetData = useDraftStore((state) => state.loadPresetData);
    const setAIMode = useDraftStore((state) => state.setAIMode);
    const setUserTeamId = useDraftStore((state) => state.setUserTeamId);
    const setCustomMode = useDraftStore((state) => state.setCustomMode);
    const resetMultiplayer = useMultiplayerStore((state) => state.reset);
    const initializePeer = useMultiplayerStore((state) => state.initializePeer);
    const myId = useMultiplayerStore((state) => state.myId);
    const isConnecting = useMultiplayerStore((state) => state.isConnecting);

    React.useEffect(() => {
        resetMultiplayer();
        useDraftStore.getState().resetAll();

        // Auto-connect to get a fresh ID immediately
        initializePeer('User-' + Math.floor(Math.random() * 1000));
    }, []);

    const handleCustomStart = () => {
        setAIMode(false);
        setCustomMode(true);
        setUserTeamId(null);
        setStep('INPUT');
    };

    const handleSoloPreset = () => {
        setAIMode(false);
        setCustomMode(false);
        setUserTeamId(null);
        loadPresetData();
    };

    const handleAIMode = () => {
        setAIMode(true);
        setCustomMode(false);
        setUserTeamId(null); // Will be set in OrderSetting
        loadPresetData();
    };

    return (
        <div className="flex-1 w-full flex flex-col justify-center items-center">
            <div className="flex-[1]" />
            <div className="flex items-center justify-center w-full">
                {/* Left: Custom Mode */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 border-r border-white h-full relative overflow-hidden group bg-transparent">
                    <div className="relative z-10 text-center space-y-6 max-w-md">
                        <div className="space-y-2">
                            <h2 className="text-sm font-bold tracking-[0.3em] text-text-sub uppercase">Team Building</h2>
                            <h1 className="text-5xl font-black text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,163,0.5)]">
                                SNAKE DRAFT
                            </h1>
                        </div>
                        <p className="text-text-sub leading-relaxed">
                            스네이크 드래프트 방식을 사용하여<br />팀장들에게 공정하게 선수를 배분하세요.
                        </p>
                        <button
                            onClick={handleCustomStart}
                            className="flex items-center justify-center gap-3 w-full py-4 bg-surface hover:bg-white/5 border border-white/10 hover:border-primary/50 rounded-xl transition-all group/btn"
                        >
                            <span className="font-bold text-white group-hover/btn:text-primary transition-colors">사용자 설정으로 시작하기</span>
                            <Play className="w-4 h-4 text-text-sub group-hover/btn:text-primary transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Right: Preset & Multi Mode */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 h-full relative overflow-hidden group bg-transparent">
                    {/* <div className="absolute inset-0 bg-gradient-to-bl from-surface to-app opacity-50 group-hover:opacity-30 transition-opacity"></div> */}
                    <div className="relative z-10 text-center space-y-8 max-w-md w-full">
                        <div className="space-y-2">
                            <h2 className="text-sm font-bold tracking-[0.3em] text-text-sub uppercase">2025</h2>
                            <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                CHZZK CUP
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 gap-4 w-full">
                            <button
                                onClick={handleSoloPreset}
                                className="flex items-center justify-between px-6 py-4 bg-primary hover:bg-green-400 text-black rounded-xl font-bold transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,255,163,0.2)]"
                            >
                                <span className="flex items-center gap-3">
                                    <Play className="w-5 h-5" />
                                    혼자 해보기
                                </span>
                                <span className="text-xs opacity-70 font-normal">프리셋 모드</span>
                            </button>

                            <button
                                onClick={handleAIMode}
                                className="flex items-center justify-between px-6 py-4 bg-surface hover:bg-white/10 border border-white/10 hover:border-primary/50 text-white rounded-xl transition-all hover:shadow-[0_0_15px_rgba(0,255,163,0.1)]"
                            >
                                <span className="flex items-center gap-3">
                                    <Bot className="w-5 h-5 text-primary" />
                                    AI와 해보기
                                </span>
                                <span className="text-xs text-text-sub">싱글 플레이</span>
                            </button>

                            <button
                                onClick={() => setStep('LOBBY')}
                                disabled={!myId || isConnecting}
                                className="flex items-center justify-between px-6 py-4 bg-surface hover:bg-white/10 border border-white/10 hover:border-primary/50 text-white rounded-xl transition-all hover:shadow-[0_0_15px_rgba(0,255,163,0.1)] disabled:opacity-50 disabled:cursor-not-allowed group/multi"
                            >
                                <span className="flex items-center gap-3 group-hover/multi:text-white transition-colors">
                                    <Swords className={`w-5 h-5 ${isConnecting ? 'animate-pulse' : 'text-text-sub group-hover/multi:text-white'}`} />
                                    <span className={isConnecting ? 'text-text-sub' : ''}>
                                        {isConnecting ? '서버 연결 중...' : '멀티플레이'}
                                    </span>
                                </span>
                                <span className="text-xs text-text-sub group-hover/multi:text-white transition-colors">방 만들기 / 입장</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-[1.5]" />
        </div>
    );
};
