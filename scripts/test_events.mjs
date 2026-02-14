// Quick test of the new ladder/snake generation logic
function mulberry32(seed) {
    return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

for (const seed of [42, 123, 999, 2026]) {
    const rng = mulberry32(seed);
    const reserved = new Set([1, 25, 50, 75, 100]);
    const allSource = new Set(reserved);
    const MOVE_MIN = 7, MOVE_MAX = 20;

    const ladderZones = [
        { from: 5, to: 22 }, { from: 23, to: 40 },
        { from: 41, to: 58 }, { from: 59, to: 76 }, { from: 77, to: 93 },
    ];
    const trapZones = [
        { from: 10, to: 27 }, { from: 28, to: 45 },
        { from: 46, to: 63 }, { from: 64, to: 81 }, { from: 82, to: 98 },
    ];

    const ladders = [];
    for (const zone of ladderZones) {
        const pool = [];
        for (let f = zone.from; f <= zone.to; f++) if (!reserved.has(f)) pool.push(f);
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const floor = pool[0];
        allSource.add(floor);
        const minT = Math.min(floor + MOVE_MIN, 99), maxT = Math.min(floor + MOVE_MAX, 99);
        const cands = [];
        for (let f = minT; f <= maxT; f++) if (!allSource.has(f)) cands.push(f);
        const target = cands.length > 0 ? cands[Math.floor(rng() * cands.length)] : minT;
        ladders.push({ floor, target, delta: target - floor });
    }

    const traps = [];
    for (const zone of trapZones) {
        const pool = [];
        for (let f = zone.from; f <= zone.to; f++) if (!allSource.has(f)) pool.push(f);
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const floor = pool[0];
        allSource.add(floor);
        const minT = Math.max(floor - MOVE_MAX, 2), maxT = Math.max(floor - MOVE_MIN, 2);
        const cands = [];
        for (let f = minT; f <= maxT; f++) if (!allSource.has(f)) cands.push(f);
        const target = cands.length > 0 ? cands[Math.floor(rng() * cands.length)] : Math.max(minT, 2);
        traps.push({ floor, target, delta: floor - target });
    }

    console.log('=== Seed:', seed, '===');
    console.log('Ladders (small -> large, +7 to +20):');
    for (const l of ladders) {
        const ok = l.floor >= 5 && l.floor <= 93 && l.target > l.floor && l.delta >= 7 && l.delta <= 20;
        console.log('  floor', l.floor, '->', l.target, '(+' + l.delta + ')', ok ? 'OK' : 'FAIL');
    }
    console.log('Snakes (large -> small, -7 to -20):');
    for (const t of traps) {
        const ok = t.floor >= 10 && t.floor <= 98 && t.target < t.floor && t.delta >= 7 && t.delta <= 20;
        console.log('  floor', t.floor, '->', t.target, '(-' + t.delta + ')', ok ? 'OK' : 'FAIL');
    }
    console.log('');
}
