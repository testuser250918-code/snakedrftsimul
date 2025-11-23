import * as amplitude from '@amplitude/unified';

// Initialize Amplitude
export const initAnalytics = () => {
    const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY;
    if (API_KEY) {
        amplitude.initAll(API_KEY, {
            analytics: {
                autocapture: true,
            },
            sessionReplay: {
                sampleRate: 1,
            },
        });
    } else {
        console.warn('Amplitude API Key not found. Analytics disabled.');
    }
};

// Track specific events
export const trackEvent = (eventName: string, eventProperties?: Record<string, any>) => {
    if (import.meta.env.VITE_AMPLITUDE_API_KEY) {
        amplitude.track(eventName, eventProperties);
    }
};

// Track errors
export const trackError = (error: string, location: string) => {
    trackEvent('Error Occurred', {
        errorMessage: error,
        location: location,
    });
};

// Pre-defined Events
export const ANALYTICS_EVENTS = {
    PAGE_VIEW: 'Page View',
    START_DRAFT_SOLO: 'Start Draft (Solo)',
    START_DRAFT_AI: 'Start Draft (AI)',
    START_DRAFT_MULTI: 'Start Draft (Multiplayer)',
    CREATE_ROOM: 'Create Room',
    JOIN_ROOM: 'Join Room',
    PICK_PLAYER: 'Pick Player',
    UNDO_ACTION: 'Undo Action',
    RESET_DRAFT: 'Reset Draft',
    GAME_COMPLETE: 'Game Complete',
};
