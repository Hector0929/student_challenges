import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { useEarnStars } from '../../hooks/useQuests';
import { pickChallengeForFloor } from './challenges/challengeRegistry';
import {
    CHALLENGE_REWARD_STARS,
    DIFFICULTY_LABEL,
    difficultyForFloor,
    retriesFromCollection,
} from './challenges/types';

interface TowerChallengeOverlayProps {
    userId: string;
    /** 觸發挑戰的樓層；null = 不顯示 */
    floor: number | null;
    /** 玩家目前收藏的怪獸總數，決定失敗後可以重試幾次 */
    collectionCount: number;
    /** 隨行夥伴，用在鼓勵文案上 */
    companionName?: string;
    /** 挑戰結束時關閉；passed 用來決定是否繼續前進 */
    onFinish: (passed: boolean) => void;
}

type Phase = 'intro' | 'playing' | 'result';

/**
 * 塔內挑戰的宿主：說明 → 遊戲 → 結果（可重試）。
 * 過關發星幣，失敗不扣任何東西，只是原地停留。
 */
export const TowerChallengeOverlay: React.FC<TowerChallengeOverlayProps> = ({
    userId,
    floor,
    collectionCount,
    companionName,
    onFinish,
}) => {
    const [phase, setPhase] = useState<Phase>('intro');
    const [passed, setPassed] = useState(false);
    const [retriesLeft, setRetriesLeft] = useState(() => retriesFromCollection(collectionCount));
    const [runKey, setRunKey] = useState(0);
    const earnStars = useEarnStars();

    const difficulty = floor ? difficultyForFloor(floor) : 'easy';
    const challenge = floor ? pickChallengeForFloor(floor) : null;
    const reward = CHALLENGE_REWARD_STARS[difficulty];

    const handleResult = useCallback(async (didPass: boolean) => {
        setPassed(didPass);
        setPhase('result');

        if (didPass) {
            try {
                await earnStars.mutateAsync({
                    userId,
                    amount: reward,
                    gameId: 'monster_tower_challenge',
                    description: `🏰 怪獸塔第 ${floor} 層挑戰過關`,
                });
            } catch (error) {
                console.error('Challenge reward failed:', error);
            }
        }
    }, [earnStars, floor, reward, userId]);

    const handleRetry = () => {
        setRetriesLeft((remaining) => remaining - 1);
        setRunKey((key) => key + 1);
        setPhase('playing');
    };

    if (!floor || !challenge) return null;

    const ChallengeComponent = challenge.Component;

    return (
        <div className="absolute inset-0 z-[2400] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl border-2 border-amber-500/40 bg-slate-950 shadow-2xl overflow-hidden gen3-effect-burst">

                {/* 標題列 */}
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl">{challenge.icon}</span>
                        <div className="min-w-0">
                            <h3 className="font-black text-sm text-amber-200 truncate">{challenge.title}</h3>
                            <p className="text-[11px] text-slate-400">
                                第 {floor} 層 · {DIFFICULTY_LABEL[difficulty]}
                            </p>
                        </div>
                    </div>
                    {phase === 'result' && (
                        <button
                            onClick={() => onFinish(passed)}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="p-4">
                    {phase === 'intro' && (
                        <div className="text-center">
                            <div className="text-5xl mb-3">👾</div>
                            <p className="text-sm text-slate-200 font-bold mb-1">守門怪獸擋住去路！</p>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed">{challenge.howTo}</p>
                            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 mb-4 text-xs text-slate-300">
                                <p>過關可以拿到 <span className="font-black text-amber-300">{reward} ⭐</span></p>
                                <p className="text-slate-500 mt-1">沒過關也不會倒退，只是這回合原地停留</p>
                            </div>
                            <button
                                onClick={() => setPhase('playing')}
                                data-testid="challenge-start-btn"
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg active:scale-95 transition-transform"
                            >
                                開始挑戰！
                            </button>
                        </div>
                    )}

                    {phase === 'playing' && (
                        <ChallengeComponent key={runKey} difficulty={difficulty} onResult={handleResult} />
                    )}

                    {phase === 'result' && (
                        <div className="text-center">
                            <div className="text-5xl mb-3">{passed ? '🎉' : '💤'}</div>
                            <h4 className={`text-xl font-black mb-1 ${passed ? 'text-emerald-300' : 'text-slate-300'}`}>
                                {passed ? '挑戰成功！' : '這次沒成功'}
                            </h4>
                            {passed ? (
                                <p className="text-sm text-amber-300 font-bold mb-4">獲得 {reward} ⭐ 星幣</p>
                            ) : (
                                <p className="text-xs text-slate-400 mb-4">
                                    沒關係，這回合先在原地休息，下次擲骰再繼續往上爬。
                                </p>
                            )}

                            {!passed && retriesLeft > 0 && (
                                <div className="mb-3">
                                    <button
                                        onClick={handleRetry}
                                        data-testid="challenge-retry-btn"
                                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black shadow-lg active:scale-95 transition-transform"
                                    >
                                        再試一次（剩 {retriesLeft} 次）
                                    </button>
                                    <p className="text-[11px] text-cyan-300/80 mt-2">
                                        {companionName ? `${companionName} 幫你爭取到重試機會！` : '收藏越多怪獸，重試機會越多！'}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => onFinish(passed)}
                                data-testid="challenge-close-btn"
                                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors active:scale-95"
                            >
                                {passed ? '繼續爬塔' : '結束回合'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TowerChallengeOverlay;
