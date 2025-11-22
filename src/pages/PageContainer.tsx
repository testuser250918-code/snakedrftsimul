import React from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { Home } from './Home';
import { InputForm } from './InputForm';
import { OrderSetting } from './OrderSetting';
import { DraftBoard } from './DraftBoard';
import { MultiplayerLobby } from './MultiplayerLobby';

export const PageContainer: React.FC = () => {
    const step = useDraftStore((state) => state.step);

    switch (step) {
        case 'HOME':
            return <Home />;
        case 'INPUT':
            return <InputForm />;
        case 'ORDER_SETTING':
            return <OrderSetting />;
        case 'DRAFTING':
            return <DraftBoard />;
        case 'LOBBY':
            return <MultiplayerLobby />;
        default:
            return <Home />;
    }
};
