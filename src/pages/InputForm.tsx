import React, { useState } from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { Upload, AlertCircle, ArrowRight, Edit2 } from 'lucide-react';
import type { Team, Player } from '../types';
import clsx from 'clsx';

export const InputForm: React.FC = () => {
    const uploadData = useDraftStore((state) => state.uploadData);
    const teams = useDraftStore((state) => state.teams);
    const players = useDraftStore((state) => state.players);
    const positionNames = useDraftStore((state) => state.positionNames);
    const setStep = (step: 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING') => useDraftStore.setState({ step });

    const [inputText, setInputText] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    // Placeholder example
    const placeholderText = `Top, 팀장1, 팀장2, 팀장3, 팀장4, 팀장5
Jungle, 선수1-1, 선수1-2, 선수1-3, 선수1-4, 선수1-5
Mid, 선수2-1, 선수2-2, 선수2-3, 선수2-4, 선수2-5
Bottom, 선수3-1, 선수3-2, 선수3-3, 선수3-4, 선수3-5
Support, 선수4-1, 선수4-2, 선수4-3, 선수4-4, 선수4-5`;

    // Check if data is valid (Strict check is done in store, here we just check if store has data)
    const isValid = teams.length === 5 && players.length === 20;

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setInputText(text);
        uploadData(text);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setInputText(text);
                uploadData(text);
                setIsLocked(true); // Lock only on file upload
            };
            reader.readAsText(file);
            // Reset input value to allow re-uploading same file if needed
            event.target.value = '';
        }
    };

    const handleUnlock = () => {
        if (window.confirm('데이터를 수정하시겠습니까? 현재 입력된 내용이 유지된 상태로 잠금이 해제됩니다.')) {
            setIsLocked(false);
        }
    };

    const handleNextStep = () => {
        if (isValid) {
            setStep('ORDER_SETTING');
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">데이터 입력</h2>
                    <p className="text-text-sub text-xs">CSV 형식으로 데이터를 입력하거나 파일을 업로드하세요.</p>
                </div>

                {isValid && (
                    <button
                        onClick={handleNextStep}
                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-green-400 text-black rounded-full font-bold transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(0,255,163,0.3)] text-sm"
                    >
                        다음 단계
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Main Content Area - Height reduced to ~50vh */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[50vh] shrink-0">
                {/* Left: Input Area */}
                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">입력 (Input)</h3>
                        <div className="flex gap-2">
                            {isLocked ? (
                                <button
                                    onClick={handleUnlock}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    수정하기
                                </button>
                            ) : (
                                <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-surface border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                    <Upload className="w-3 h-3" />
                                    CSV 파일 업로드
                                    <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                                </label>
                            )}
                        </div>
                    </div>

                    <textarea
                        value={inputText}
                        onChange={handleTextChange}
                        disabled={isLocked}
                        placeholder={placeholderText}
                        className={clsx(
                            "flex-1 w-full bg-surface border rounded-xl p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none transition-colors",
                            isLocked
                                ? "border-white/5 text-text-sub cursor-not-allowed opacity-70"
                                : "border-white/10 text-white focus:border-primary/50 placeholder:text-text-sub/20"
                        )}
                        spellCheck={false}
                    />
                </div>

                {/* Right: Preview Area */}
                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <AlertCircle className={clsx("w-4 h-4", isValid ? "text-primary" : "text-text-sub")} />
                            미리보기 (Preview)
                        </h3>
                        <span className={clsx("text-xs font-medium", isValid ? "text-primary" : "text-text-sub")}>
                            {isValid ? "데이터 확인 완료" : "데이터를 입력해주세요"}
                        </span>
                    </div>

                    <div className="flex-1 bg-surface border border-white/5 rounded-xl overflow-auto p-4 space-y-4 shadow-inner">
                        {/* 1. Team Leaders */}
                        <section className="space-y-2">
                            <h4 className="text-[10px] font-bold text-text-sub uppercase tracking-wider">팀장 목록</h4>
                            {teams.length > 0 ? (
                                <div className="grid grid-cols-5 gap-2">
                                    {teams.map((team: Team) => (
                                        <div key={team.id} className="bg-app p-2 rounded-lg border border-white/5 text-center">
                                            <div className="text-[9px] text-text-sub mb-0.5">Team {team.id.split('-')[1]}</div>
                                            <div className="font-bold text-white text-xs truncate">{team.leaderName}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-text-sub/30 italic text-center py-4 border border-dashed border-white/5 rounded-lg">
                                    팀장 데이터가 없습니다.
                                </div>
                            )}
                        </section>

                        {/* 2. Players */}
                        <section className="space-y-2">
                            <h4 className="text-[10px] font-bold text-text-sub uppercase tracking-wider">선수 목록</h4>
                            {positionNames.length > 0 ? (
                                <div className="bg-app rounded-lg border border-white/5 overflow-hidden">
                                    <div className="grid grid-cols-6 gap-px bg-white/5">
                                        {/* Header */}
                                        <div className="bg-surface p-2 text-[10px] font-bold text-text-sub uppercase text-center">Pos</div>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="bg-surface p-2 text-[10px] font-bold text-text-sub uppercase text-center">
                                                P{i + 1}
                                            </div>
                                        ))}

                                        {/* Rows */}
                                        {positionNames.map((pos) => {
                                            const posPlayers = players.filter((p: Player) => p.position === pos);
                                            return (
                                                <React.Fragment key={pos}>
                                                    <div className="bg-surface p-2 flex items-center justify-center font-bold text-primary text-xs border-r border-white/5">
                                                        {pos}
                                                    </div>
                                                    {posPlayers.map((player: Player) => (
                                                        <div key={player.id} className="bg-surface p-2 flex items-center justify-center text-xs text-white hover:bg-white/5 transition-colors">
                                                            {player.name}
                                                        </div>
                                                    ))}
                                                    {Array.from({ length: 5 - posPlayers.length }).map((_, i) => (
                                                        <div key={`empty-${i}`} className="bg-surface p-2"></div>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-text-sub/30 italic text-center py-8 border border-dashed border-white/5 rounded-lg">
                                    선수 데이터가 없습니다.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            {/* Bottom spacing filler if needed, or just let the flex container handle it */}
            <div className="flex-1"></div>
        </div>
    );
};
