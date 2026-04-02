import React, { useState, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Cell = 0 | 1 | 2; // 0=empty, 1=black, 2=white
type Board = Cell[][];
type BgTheme = 'forest' | 'ocean' | 'sakura' | 'night' | 'desert';

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as const;

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

// ── Simple AI: picks move that flips the most pieces ─────────────────────
function aiMove(board: Board): [number, number] | null {
    const moves = getLegalMoves(board, 2);
    if (moves.length === 0) return null;
    let best = moves[0], bestScore = -1;
    for (const [r, c] of moves) {
        const score = getFlips(board, r, c, 2).length;
        if (score > bestScore) { bestScore = score; best = [r, c]; }
    }
    return best;
}

// ── Component ──────────────────────────────────────────────────────────────
export function OthelloPractice() {
    const [board, setBoard] = useState<Board>(makeBoard);
    const [player, setPlayer] = useState<1 | 2>(1); // 1=black(human), 2=white(AI)
    const [lastFlips, setLastFlips] = useState<[number, number][]>([]);
    const [lastPlaced, setLastPlaced] = useState<[number,number] | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [theme, setTheme] = useState<BgTheme>('forest');
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [thinking, setThinking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const legalMoves = useMemo(() => getLegalMoves(board, 1), [board]);
    const legalSet = useMemo(() => new Set(legalMoves.map(([r,c]) => `${r},${c}`)), [legalMoves]);
    const { black, white } = useMemo(() => countPieces(board), [board]);
    const t = BG_THEMES[theme];

    const reset = useCallback(() => {
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

        // Check if AI has moves
        const aiMoves = getLegalMoves(next, 2);
        if (aiMoves.length === 0) {
            // Check if human has moves
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

        // AI turn
        setPlayer(2);
        setThinking(true);
        setMessage(null);
        setTimeout(() => {
            const move = aiMove(next);
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
                    } else {
                        setMessage('你沒有合法步，電腦繼續！');
                        setPlayer(2);
                        setThinking(false);
                        return;
                    }
                } else {
                    setPlayer(1);
                }
            }
            setThinking(false);
        }, 600);
    }, [board, gameOver, player, thinking]);

    const flipSet = useMemo(() => new Set(lastFlips.map(([r,c]) => `${r},${c}`)), [lastFlips]);

    return (
        <div className={`h-full w-full flex flex-col items-center justify-start bg-gradient-to-br ${t.bg} overflow-y-auto py-4 px-2`}>

            {/* Header */}
            <div className="w-full max-w-md flex items-center justify-between mb-3 px-1">
                <div className="font-pixel text-white text-lg drop-shadow">♟ 黑白棋</div>
                <div className="flex items-center gap-2">
                    {/* Theme button */}
                    <button
                        onClick={() => setShowThemePicker(v => !v)}
                        className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors text-sm"
                    >
                        🎨
                    </button>
                    <button
                        onClick={reset}
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

            {/* Game over overlay button */}
            {gameOver && (
                <button
                    onClick={reset}
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
