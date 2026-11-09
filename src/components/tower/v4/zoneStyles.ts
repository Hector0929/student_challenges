// 怪獸塔五個區域的配色與名稱。純資料，不依賴 three.js，
// 讓預覽卡片等輕量元件可以引用，不必把整個 3D 場景一起載入。
export interface ZoneStyle {
    name: string;
    tile: [number, number];
    stone: number;
    trim: number;
    sky: number;
}
export const ZONE_STYLES: ZoneStyle[] = [
    { name: '晨霧草原', tile: [0xa6d96a, 0x7cbf4a], stone: 0x9b9486, trim: 0x6f8f4e, sky: 0xbfe6f5 },
    { name: '冰晶斷崖', tile: [0xc4ecf7, 0x8fd3ea], stone: 0x93a6ba, trim: 0x5f9fc2, sky: 0xd3ecfb },
    { name: '熔岩工坊', tile: [0xf5b860, 0xe38c3e], stone: 0x75574d, trim: 0xb8452c, sky: 0xf6cda6 },
    { name: '機械雲城', tile: [0xb9bdf6, 0x9097ea], stone: 0x717892, trim: 0x4f56b8, sky: 0xcdd0f6 },
    { name: '星穹神殿', tile: [0xebc9f7, 0xcd9fea], stone: 0xbcaacd, trim: 0x8a5cc0, sky: 0xeedaf7 },
];

export const ZONE_ICONS = ['🌿', '❄️', '🌋', '⚙️', '✨'];
