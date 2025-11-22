import type { Player } from './types';

export const PRESET_LEADERS = ['갱맘', '뱅', '소우릎', '울프', '큐베'];

export const POOL_DATA: Omit<Player, 'id' | 'isDrafted' | 'draftedBy'>[] = [
    // TOP
    { name: '운타라', position: 'TOP', score: 95, tier: 'S' },
    { name: '김뿡', position: 'TOP', score: 88, tier: 'A' },
    { name: '룩삼', position: 'TOP', score: 78, tier: 'B' },
    { name: '얍얍', position: 'TOP', score: 74, tier: 'B' },
    { name: '한동숙', position: 'TOP', score: 65, tier: 'C' },
    // MID
    { name: '앰비션', position: 'MID', score: 99, tier: 'S' },
    { name: '인섹', position: 'MID', score: 94, tier: 'S' },
    { name: '피닉스박', position: 'MID', score: 85, tier: 'A' },
    { name: '랄로', position: 'MID', score: 77, tier: 'B' },
    { name: '트롤야', position: 'MID', score: 60, tier: 'C' },
    // BOT
    { name: '괴물쥐', position: 'BOT', score: 89, tier: 'A' },
    { name: '명예훈장', position: 'BOT', score: 79, tier: 'B' },
    { name: '삼식', position: 'BOT', score: 79, tier: 'B' },
    { name: '러너', position: 'BOT', score: 79, tier: 'B' },
    { name: '따효니', position: 'BOT', score: 79, tier: 'B' },
    // SUP
    { name: '순당무', position: 'SUP', score: 92, tier: 'S' },
    { name: '인간젤리', position: 'SUP', score: 87, tier: 'A' },
    { name: '던', position: 'SUP', score: 75, tier: 'B' },
    { name: '푸린', position: 'SUP', score: 72, tier: 'B' },
    { name: '소풍왔니', position: 'SUP', score: 68, tier: 'C' },
];
