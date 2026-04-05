import { useState, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Cell = 0 | 1 | 2; // 0=empty, 1=black, 2=white
type Board = Cell[][];
type BgTheme = 'forest' | 'ocean' | 'sakura' | 'night' | 'desert';
type Difficulty = 'easy' | 'medium' | 'hard';

const BG_THEMES: Record<BgTheme, { label: string; emoji: string; board: string; bg: string; cell: string }> = {
    forest: {
        label: '森林',  emoji: '🌲',
        bg: 'from-green-800 to-emerald-900',
        board: 'bg-green-700 border-green-900',
        cell: 'bg-green-600 border-green-800',
    },
    ocean: {
        label: '海洋',  emoji: '🌊',
        bg: 'from-blue-800 to-cyan-900',
        board: 'bg-blue-700 border-blue-900',
        cell: 'bg-blue-600 border-blue-800',
    },
    sakura: {
        label: '櫻花',  emoji: '🌸',
        bg: 'from-pink-400 to-rose-600',
        board: 'bg-pink-500 border-pink-700',
        cell: 'bg-pink-400 border-pink-600',
    },
    night: {
        label: '星夜',  emoji: '🌙',
        bg: 'from-indigo-900 to-slate-900',
        board: 'bg-indigo-800 border-indigo-950',
        cell: 'bg-indigo-700 border-indigo-900',
    },
    desert: {
        label: '沙漠',  emoji: '🏜️',
        bg: 'from-amber-600 to-orange-800',
        board: 'bg-amber-500 border-amber-700',
        cell: 'bg-amber-400 border-amber-600',
    },
};

const DIFFICULTY_CONFIG: Record<Difficulty, {
    label: string;
    emoji: string;
    desc: string;
    color: string;
    activeColor: string;
    delay: number;
}> = {
    easy: {
        label: '弱',
        emoji: '🌱',
        desc: '隨機落子，適合新手練習',
        color: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200',
        activeColor: 'bg-emerald-500/50 border-emerald-300 text-white ring-2 ring-emerald-300/60',
        delay: 400,
    },
    medium: {
        label: '中',
        emoji: '⚔️',
        desc: '思考兩步，有基本策略',
        color: 'bg-amber-500/20 border-amber-400/30 text-amber-200',
        activeColor: 'bg-amber-500/50 border-amber-300 text-white ring-2 ring-amber-300/60',
        delay: 600,
    },
    hard: {
        label: '強',
        emoji: '💀',
        desc: '深度策略，極難擊敗',
        color: 'bg-red-500/20 border-red-400/30 text-red-200',
        activeColor: 'bg-red-500/50 border-red-300 text-white ring-2 ring-red-300/60',
        delay: 800,
    },
};

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as const;

// ── Game logic ─────────────────────────────────────────────────────────────
function makeBoard(): Board {
    const b: Board = Array.from({ length: 8 }, () => Array(8).fill(0));
    b[3][3] = 2; b[3][4] = 1;
    b[4][3] = 1; b[4][4] = 2;
    return b;
}

function inBounds(r: number, c: number) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getFlips(board: Board, r: number, c: number, player: 1 | 2): [number, number][] {
    if (board[r][c] !== 0) return [];
    const opp = player === 1 ? 2 : 1;
    const flips: [number, number][] = [];
    for (const [dr, dc] of DIRS) {
        const line: [number, number][] = [];
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc) && board[nr][nc] === opp) {
            line.push([nr, nc]);
            nr += dr; nc += dc;
        }
        if (line.length > 0 && inBounds(nr, nc) && board[nr][nc] === player) {
            flips.push(...line);
        }
    }
    return flips;
}

function getLegalMoves(board: Board, player: 1 | 2): [number, number][] {
    const moves: [number, number][] = [];
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (getFlips(board, r, c, player).length > 0)
                moves.push([r, c]);
    return moves;
}

function applyMove(board: Board, r: number, c: number, player: 1 | 2): Board {
    const flips = getFlips(board, r, c, player);
    const next = board.map(row => [...row]) as Board;
    next[r][c] = player;
    for (const [fr, fc] of flips) next[fr][fc] = player;
    return next;
}

function countPieces(board: Board): { black: number; white: number } {
    let black = 0, white = 0;
    for (const row of board) for (const c of row) { if (c === 1) black++; else if (c === 2) white++; }
    return { black, white };
}

// ── AI ─────────────────────────────────────────────────────────────────────
// Positional weight table — corners = huge value, X-squares = penalty
const POS_WEIGHTS: number[][] = [
    [120, -20,  20,   5,   5,  20, -20, 120],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [120, -20,  20,   5,   5,  20, -20, 120],
];

function evaluate(board: Board): number {
    let score = 0;
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === 2) score += POS_WEIGHTS[r][c];
            else if (board[r][c] === 1) score -= POS_WEIGHTS[r][c];
        }
    score += getLegalMoves(board, 2).length * 5;
    score -= getLegalMoves(board, 1).length * 5;
    return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximising: boolean): number {
    const player: 1 | 2 = maximising ? 2 : 1;
    const moves = getLegalMoves(board, player);

    if (depth === 0 || (moves.length === 0 && getLegalMoves(board, maximising ? 1 : 2).length === 0)) {
        return evaluate(board);
    }

    if (moves.length === 0) {
        return minimax(board, depth - 1, alpha, beta, !maximising);
    }

    if (maximising) {
        let best = -Infinity;
        for (const [r, c] of moves) {
            const val = minimax(applyMove(board, r, c, 2), depth - 1, alpha, beta, false);
            best = Math.max(best, val);
            alpha = Math.max(alpha, val);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const [r, c] of moves) {
            const val = minimax(applyMove(board, r, c, 1), depth - 1, alpha, beta, true);
            best = Math.min(best, val);
            beta = Math.min(beta, val);
            if (beta <= alpha) break;
        }
        return best;
    }
}

// 根據難度選擇 AI 策略：
//   easy   → 隨機落子（無策略）
//   medium → minimax 深度 2（基本策略）
//   hard   → minimax 深度 4（深度策略，現行強度）
function aiMoveForDifficulty(board: Board, difficulty: Difficulty): [number, number] | null {
    const moves = getLegalMoves(board, 2);
    if (moves.length === 0) return null;

    if (difficulty === 'easy') {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    const depth = difficulty === 'medium' ? 2 : 4;
    let best = moves[0], bestScore = -Infinity;
    for (const [r, c] of moves) {
        const score = minimax(applyMove(board, r, c, 2), depth, -Infinity, Infinity, false);
        if (score > bestScore) { bestScore = score; best = [r, c]; }
    }
    return best;
}

// ── Component ──────────────────────────────────────────────────────────────
export function OthelloPractice() {
    const [board, setBoard] = useState<Board>(makeBoard);
    const [player, setPlayer] = useState<1 | 2>(1);
    const [lastFlips, setLastFlips] = useState<[number, number][]>([]);
    const [lastPlaced, setLastPlaced] = useState<[number,number] | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [theme, setTheme] = useState<BgTheme>('forest');
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [thinking, setThinking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [gameStarted, setGameStarted] = useState(false);

    const legalMoves = useMemo(() => getLegalMoves(board, 1), [board]);
    const legalSet = useMemo(() => new Set(legalMoves.map(([r,c]) => `${r},${c}`)), [legalMoves]);
    const { black, white } = useMemo(() => countPieces(board), [board]);
    const t = BG_THEMES[theme];
    const d = DIFFICULTY_CONFIG[difficulty];

    const startGame = useCallback((selectedDifficulty: Difficulty) => {
        setDifficulty(selectedDifficulty);
        setBoard(makeBoard());
        setPlayer(1);
        setLastFlips([]);
        setLastPlaced(null);
        setGameOver(false);
        setMessage(null);
        setThinking(false);
        setGameStarted(true);
    }, []);

    const backToMenu = useCallback(() => {
        setGameStarted(false);
        setBoard(makeBoard());
        setPlayer(1);
        setLastFlips([]);
        setLastPlaced(null);
        setGameOver(false);
        setMessage(null);
        setThinking(false);
    }, []);

    const handleClick = useCallback((r: number, c: number) => {
        if (gameOver || player !== 1 || thinking) return;
        const flips = getFlips(board, r, c, 1);
        if (flips.length === 0) return;

        const next = applyMove(board, r, c, 1);
        setBoard(next);
        setLastPlaced([r, c]);
        setLastFlips(flips);

        const aiMoves = getLegalMoves(next, 2);
        if (aiMoves.length === 0) {
            if (getLegalMoves(next, 1).length === 0) {
                setGameOver(true);
                setPlayer(1);
                const { black: b, white: w } = countPieces(next);
                setMessage(b > w ? '🎉 你贏了！' : b < w ? '😢 電腦贏了！' : '🤝 平局！');
            } else {
                setMessage('電腦沒有合法步，換你！');
                setPlayer(1);
            }
            return;
        }

        setPlayer(2);
        setThinking(true);
        setMessage(null);
        setTimeout(() => {
            const move = aiMoveForDifficulty(next, difficulty);
            if (move) {
                const [ar, ac] = move;
                const aiFlips = getFlips(next, ar, ac, 2);
                const next2 = applyMove(next, ar, ac, 2);
                setBoard(next2);
                setLastPlaced([ar, ac]);
                setLastFlips(aiFlips);

                if (getLegalMoves(next2, 1).length === 0) {
                    if (getLegalMoves(next2, 2).length === 0) {
                        setGameOver(true);
                        const { black: b, white: w } = countPieces(next2);
                        setMessage(b > w ? '🎉 你贏了！' : b < w ? '😢 電腦贏了！' : '🤝 平局！');
                        setThinking(false);
                    } else {
                        setMessage('你沒有合法步，電腦繼續！');
                        setPlayer(2);
                        setTimeout(() => {
                            const move2 = aiMoveForDifficulty(next2, difficulty);
                            if (move2) {
                                const [ar2, ac2] = move2;
                                const next3 = applyMove(next2, ar2, ac2, 2);
                                setBoard(next3);
                                setLastPlaced([ar2, ac2]);
                                setLastFlips(getFlips(next2, ar2, ac2, 2));
                                if (getLegalMoves(next3, 1).length === 0 && getLegalMoves(next3, 2).length === 0) {
                                    setGameOver(true);
                                    const { black: b, white: w } = countPieces(next3);
                                    setMessage(b > w ? '🎉 你贏了！' : b < w ? '😢 電腦贏了！' : '🤝 平局！');
                                } else {
                                    setPlayer(getLegalMoves(next3, 1).length > 0 ? 1 : 2);
                                    setMessage(getLegalMoves(next3, 1).length > 0 ? null : '你沒有合法步，電腦繼續！');
                                }
                            }
                            setThinking(false);
                        }, d.delay);
                    }
                    return;
                } else {
                    setPlayer(1);
                }
            }
            setThinking(false);
        }, d.delay);
    }, [board, gameOver, player, thinking, difficulty, d.delay]);

    const flipSet = useMemo(() => new Set(lastFlips.map(([r,c]) => `${r},${c}`)), [lastFlips]);

    // ── 難度選擇畫面 ──────────────────────────────────────────────────────
    if (!gameStarted) {
        return (
            <div className={`h-full w-full flex flex-col items-center justify-center bg-gradient-to-br ${t.bg} overflow-y-auto py-6 px-4`}>
                {/* Theme picker in corner */}
                <div className="absolute top-4 right-4">
                    <button
                        onClick={() => setShowThemePicker(v => !v)}
                        className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors text-sm"
                    >
                        🎨
                    </button>
                    {showThemePicker && (
                        <div className="absolute right-0 top-10 bg-black/70 backdrop-blur-md rounded-2xl border border-white/20 p-3 z-10 min-w-[180px]">
                            <div className="font-pixel text-white/60 text-[10px] mb-2 uppercase tracking-wider">選擇背景</div>
                            <div className="flex flex-col gap-1.5">
                                {(Object.keys(BG_THEMES) as BgTheme[]).map(k => (
                                    <button
                                        key={k}
                                        onClick={() => { setTheme(k); setShowThemePicker(false); }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-white font-pixel text-xs transition-all ${
                                            theme === k ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                    >
                                        {BG_THEMES[k].emoji} {BG_THEMES[k].label}
                                        {theme === k && <span className="text-yellow-300 text-[10px] ml-auto">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <div className="font-pixel text-white text-2xl drop-shadow-lg mb-2">♟ 黑白棋</div>
                    <div className="font-pixel text-white/50 text-xs">選擇電腦難度，開始對戰</div>
                </div>

                {/* Difficulty cards */}
                <div className="w-full max-w-xs flex flex-col gap-3 mb-8">
                    {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(key => {
                        const cfg = DIFFICULTY_CONFIG[key];
                        const isSelected = difficulty === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                className={`
                                    flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left
                                    transition-all duration-200 active:scale-95
                                    ${isSelected ? cfg.activeColor : cfg.color + ' hover:brightness-125'}
                                `}
                            >
                                <span className="text-2xl">{cfg.emoji}</span>
                                <div className="flex-1">
                                    <div className="font-pixel text-base mb-0.5">{cfg.label}</div>
                                    <div className="font-pixel text-[10px] opacity-70">{cfg.desc}</div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? 'bg-white border-white' : 'border-white/40 bg-transparent'
                                }`}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Start button */}
                <button
                    onClick={() => startGame(difficulty)}
                    className="px-10 py-3 rounded-2xl bg-yellow-400 text-amber-900 font-pixel text-sm hover:bg-yellow-300 active:scale-95 transition-all shadow-lg shadow-yellow-500/30"
                >
                    開始遊戲 {DIFFICULTY_CONFIG[difficulty].emoji}
                </button>
            </div>
        );
    }

    // ── 遊戲畫面 ──────────────────────────────────────────────────────────
    return (
        <div className={`h-full w-full flex flex-col items-center justify-start bg-gradient-to-br ${t.bg} overflow-y-auto py-4 px-2`}>

            {/* Header */}
            <div className="w-full max-w-md flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="font-pixel text-white text-lg drop-shadow">♟ 黑白棋</div>
                    {/* 難度標籤 */}
                    <span className={`font-pixel text-[10px] px-2 py-0.5 rounded-full border ${d.color}`}>
                        {d.emoji} {d.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowThemePicker(v => !v)}
                        className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors text-sm"
                    >
                        🎨
                    </button>
                    <button
                        onClick={backToMenu}
                        className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors font-pixel text-xs"
                    >
                        重新開始
                    </button>
                </div>
            </div>

            {/* Theme picker dropdown */}
            {showThemePicker && (
                <div className="w-full max-w-md mb-3">
                    <div className="bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 p-3">
                        <div className="font-pixel text-white/60 text-[10px] mb-2 uppercase tracking-wider">選擇背景</div>
                        <div className="flex gap-2 flex-wrap">
                            {(Object.keys(BG_THEMES) as BgTheme[]).map(k => (
                                <button
                                    key={k}
                                    onClick={() => { setTheme(k); setShowThemePicker(false); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-pixel text-xs transition-all ${
                                        theme === k ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/10 hover:bg-white/20'
                                    }`}
                                >
                                    {BG_THEMES[k].emoji} {BG_THEMES[k].label}
                                    {theme === k && <span className="text-yellow-300 text-[10px]">✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Score bar */}
            <div className="w-full max-w-md flex items-center gap-3 mb-3">
                <div className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl bg-black/40 border-2 ${player === 1 && !gameOver ? 'border-yellow-300' : 'border-white/10'}`}>
                    <div className="w-5 h-5 rounded-full bg-gray-900 border-2 border-white shadow" />
                    <span className="font-pixel text-white text-base">{black}</span>
                    <span className="font-pixel text-white/50 text-[10px]">你</span>
                </div>
                <div className="font-pixel text-white/40 text-xs">VS</div>
                <div className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl bg-white/20 border-2 ${player === 2 && !gameOver ? 'border-yellow-300' : 'border-white/10'}`}>
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 shadow" />
                    <span className="font-pixel text-white text-base">{white}</span>
                    <span className="font-pixel text-white/50 text-[10px]">電腦</span>
                </div>
            </div>

            {/* Status message */}
            <div className="h-7 mb-2 flex items-center justify-center">
                {message ? (
                    <div className="font-pixel text-white text-sm bg-black/40 px-4 py-1 rounded-full">{message}</div>
                ) : thinking ? (
                    <div className="font-pixel text-white/60 text-xs animate-pulse">電腦思考中…</div>
                ) : (
                    <div className="font-pixel text-white/50 text-xs">
                        {legalMoves.length > 0 ? `你有 ${legalMoves.length} 個合法步` : ''}
                    </div>
                )}
            </div>

            {/* Board */}
            <div className={`rounded-2xl border-4 ${t.board} p-2 shadow-2xl`}>
                <div className="grid grid-cols-8 gap-1">
                    {board.map((row, r) =>
                        row.map((cell, c) => {
                            const key = `${r},${c}`;
                            const isLegal = legalSet.has(key) && !gameOver && player === 1 && !thinking;
                            const isFlipping = flipSet.has(key);
                            const isLast = lastPlaced?.[0] === r && lastPlaced?.[1] === c;
                            return (
                                <div
                                    key={key}
                                    onClick={() => handleClick(r, c)}
                                    className={`
                                        w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center relative
                                        ${t.cell}
                                        ${isLegal ? 'cursor-pointer hover:brightness-125' : ''}
                                        ${isLast ? 'ring-2 ring-yellow-300' : ''}
                                        transition-all duration-150
                                    `}
                                >
                                    {cell !== 0 && (
                                        <div className={`
                                            w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md border-2
                                            ${cell === 1 ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
                                            ${isFlipping ? 'scale-75' : 'scale-100'}
                                            transition-transform duration-300
                                        `} />
                                    )}
                                    {cell === 0 && isLegal && (
                                        <div className="w-3 h-3 rounded-full bg-yellow-300/50" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Game over */}
            {gameOver && (
                <button
                    onClick={backToMenu}
                    className="mt-5 px-6 py-2.5 rounded-2xl bg-yellow-400 text-amber-900 font-pixel text-sm hover:bg-yellow-300 transition-colors shadow-lg"
                >
                    再玩一局
                </button>
            )}

            {/* Legend */}
            <div className="mt-4 flex gap-4 font-pixel text-white/40 text-[10px]">
                <span>● 黑棋 = 你</span>
                <span>● 白棋 = 電腦</span>
                <span>💛 可落子位置</span>
            </div>
        </div>
    );
}
