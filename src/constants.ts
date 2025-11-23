import type { Player } from './types';

export const PRESET_LEADERS = ['갱맘', '뱅', '소우릎', '울프', '큐베'];

export const POOL_DATA: Omit<Player, 'id' | 'isDrafted' | 'draftedBy'>[] = [
    // TOP
    { name: '운타라', position: 'TOP', score: 99, tier: 'S' },
    { name: '김뿡', position: 'TOP', score: 81, tier: 'A' },
    { name: '룩삼', position: 'TOP', score: 70, tier: 'C+' },
    { name: '윤가놈', position: 'TOP', score: 70, tier: 'C+' },
    { name: '한동숙', position: 'TOP', score: 69, tier: 'C+' },

    // MID
    { name: '앰비션', position: 'MID', score: 96, tier: 'S' },
    { name: '피닉스박', position: 'MID', score: 91, tier: 'A+' },
    { name: '인섹', position: 'MID', score: 90, tier: 'A+' },
    { name: '트롤야', position: 'MID', score: 83, tier: 'A-' },
    { name: '랄로', position: 'MID', score: 84, tier: 'A-' },

    // BOT
    { name: '괴물쥐', position: 'BOT', score: 95, tier: 'S' },
    { name: '삼식', position: 'BOT', score: 80, tier: 'B+' },
    { name: '러너', position: 'BOT', score: 80, tier: 'B+' },
    { name: '따효니', position: 'BOT', score: 79, tier: 'B+' },
    { name: '명예훈장', position: 'BOT', score: 79, tier: 'B+' },

    // SUP
    { name: '순당무', position: 'SUP', score: 99, tier: 'S' },
    { name: '인간젤리', position: 'SUP', score: 88, tier: 'A' },
    { name: '던', position: 'SUP', score: 76, tier: 'B' },
    { name: '푸린', position: 'SUP', score: 67, tier: 'C' },
    { name: '소풍왔니', position: 'SUP', score: 69, tier: 'C+' },
];
