import React, { useCallback, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useLotteryReward, useResetTower } from '../../hooks/useTowerProgress';
import { LotteryWheel } from '../LotteryWheel';
import { type Prize } from '../../lib/gameConfig';

interface TowerVictoryFlowProps {
    userId: string;
    open: boolean;
    /** Called once the reward has been claimed (or skipped) and the tower has been reset to floor 1 — the caller should close its own "victory" state and reseed/rescroll its board. */
    onRestart: () => void;
}

/**
 * Floor-100 victory panel → lottery wheel → tower reset flow.
 * Shared between Monster Tower V2 and Gen3.
 */
export const TowerVictoryFlow: React.FC<TowerVictoryFlowProps> = ({ userId, open, onRestart }) => {
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const lotteryRewardMutation = useLotteryReward();
    const resetTowerMutation = useResetTower();

    const handleLotteryComplete = useCallback(async (prize: Prize) => {
        try {
            await lotteryRewardMutation.mutateAsync({ userId, prizeType: prize.type, prizeValue: prize.value, monsterId: prize.monsterId, prizeName: prize.name });
        } catch (e) { console.error('Lottery failed:', e); }

        setShowLotteryWheel(false);

        try {
            await resetTowerMutation.mutateAsync({ userId });
        } catch (e) { console.error('Reset failed:', e); }

        onRestart();
    }, [userId, lotteryRewardMutation, resetTowerMutation, onRestart]);

    const handleSkip = useCallback(async () => {
        try {
            await resetTowerMutation.mutateAsync({ userId });
        } catch (e) { console.error('Reset failed:', e); }
        onRestart();
    }, [userId, resetTowerMutation, onRestart]);

    if (!open) return null;

    return (
        <>
            {!showLotteryWheel && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-[2000] backdrop-blur-sm">
                    <div className="tv2-victory tv2-pop-in">
                        <div className="text-6xl mb-2">🏆</div>
                        <h2 className="text-2xl font-black text-cyan-100 mb-1">登頂成功！</h2>
                        <p className="text-slate-400 text-sm mb-2">恭喜你攻克怪獸塔 100 層！</p>
                        <p className="text-amber-300 text-xs mb-5">轉動輪盤獲得星幣或稀有怪獸蛋！</p>
                        <button
                            onClick={() => setShowLotteryWheel(true)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02]"
                            data-testid="lottery-wheel-btn"
                        >
                            🎡 轉動抽獎輪盤！
                        </button>
                        <button
                            onClick={handleSkip}
                            className="w-full mt-2 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
                        >
                            <RotateCcw size={14} /> 跳過，直接重新挑戰
                        </button>
                    </div>
                </div>
            )}
            {showLotteryWheel && <LotteryWheel onComplete={handleLotteryComplete} />}
        </>
    );
};

export default TowerVictoryFlow;
