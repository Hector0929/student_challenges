import React, { lazy, Suspense, useMemo, useState } from 'react';
import { ChallengeIslandHome } from '../features/challengeIsland/ChallengeIslandFullScreen';
import type { FeatureDef } from '../features/challengeIsland/model';
import { useStarBalance } from '../hooks/useQuests';
import { useTowerProgress } from '../hooks/useTowerProgress';
import { useFamilySettings } from '../hooks/useFamilySettings';
import { useWorldPersistence } from '../hooks/useWorldPersistence';
import type { WorldTheme } from '../hooks/useWorldState';
import { WishQuestDialog } from '../components/WishQuestDialog';
import { ExchangeRequestDialog } from '../components/ExchangeRequestDialog';
import { useMountOnFirstOpen } from '../hooks/useMountOnFirstOpen';

// 怪獸塔、世界島、商店都是第一次打開時才下載（見 useMountOnFirstOpen）
const MonsterTowerV4 = lazy(() => import('../components/MonsterTowerV4').then((m) => ({ default: m.MonsterTowerV4 })));
const WorldFullScreen = lazy(() => import('../components/WorldFullScreen').then((m) => ({ default: m.WorldFullScreen })));
const ShopModal = lazy(() => import('../components/ShopModal').then((m) => ({ default: m.ShopModal })));

interface ChildHomeProps {
    userId: string;
    /** 回到角色選擇 */
    onSwitchProfile: () => void;
    /** 切到經典版儀表板 */
    onClassic: () => void;
}

type Feature = 'tower' | 'shop' | 'world' | 'wish' | 'exchange';

/**
 * 小孩的個人首頁：整頁就是自己的學習挑戰群島。
 * 原本儀表板上的功能都搬到「冒險港」的建築裡，點建築就打開原本的視窗。
 */
export const ChildHome: React.FC<ChildHomeProps> = ({ userId, onSwitchProfile, onClassic }) => {
    const [open, setOpen] = useState<Feature | null>(null);
    const { data: starBalance = 0 } = useStarBalance(userId);
    const { data: tower } = useTowerProgress(userId);
    const { data: settings } = useFamilySettings();
    const { data: persistedWorld } = useWorldPersistence(userId);
    // 家園背景：玩家剛換過就用新的，否則沿用存檔
    const [themeOverride, setThemeOverride] = useState<WorldTheme | null>(null);
    const worldTheme = themeOverride ?? persistedWorld?.worldLab?.worldTheme ?? 'normal';

    const floor = tower?.current_floor ?? 1;
    const dice = tower?.dice_count ?? 0;
    const exchangeEnabled = !!settings?.exchange_rate_enabled;
    const rate = settings?.star_to_twd_rate ?? 1;

    const features = useMemo<FeatureDef[]>(() => {
        const list: FeatureDef[] = [
            {
                id: 'tower',
                name: '怪獸塔',
                icon: '🗼',
                desc: `擲骰爬上 100 層的螺旋石塔，沿路撿怪獸蛋、打守門怪。目前在第 ${floor} 層，有 ${dice} 顆骰子。`,
                tags: ['怪獸塔 V4', `第 ${floor} 層`, `🎲 ${dice}`],
                style: 'spire',
                island: 'monster',
            },
            { id: 'shop', name: '商店街', icon: '🏪', desc: '用星幣買怪獸、骰子和家園道具。', tags: ['星幣商店'], style: 'stall' },
            {
                id: 'world',
                name: '冒險家家園',
                icon: '🏡',
                desc: `經營自己的小島家園，派角色出門冒險。家園等級 Lv.${persistedWorld?.worldLab?.islandLevel ?? 1}。`,
                tags: ['家園'],
                style: 'library',
            },
            { id: 'wish', name: '許願池', icon: '⛲', desc: '想做一個新的任務嗎？許個願，送給爸爸媽媽審核。', tags: ['許願新任務'], style: 'well' },
        ];
        if (exchangeEnabled) {
            list.push({ id: 'exchange', name: '星幣兌換所', icon: '💱', desc: `1 星幣 = ${rate} 元，可以申請把星幣換成零用錢。`, tags: ['兌換'], style: 'stall' });
        }
        return list;
    }, [floor, dice, exchangeEnabled, rate, persistedWorld?.worldLab?.islandLevel]);

    const parentMessage = settings?.parent_message_enabled ? settings.parent_message : null;
    const close = () => setOpen(null);
    const towerMounted = useMountOnFirstOpen(open === 'tower');
    const shopMounted = useMountOnFirstOpen(open === 'shop');
    const worldMounted = useMountOnFirstOpen(open === 'world');

    return (
        <>
            <ChallengeIslandHome
                userId={userId}
                starBalance={starBalance}
                features={features}
                onOpenFeature={(id) => setOpen(id as Feature)}
                onSwitchProfile={onSwitchProfile}
                onClassic={onClassic}
                parentMessage={parentMessage}
            />

            <Suspense fallback={null}>
                {towerMounted && <MonsterTowerV4 userId={userId} isOpen={open === 'tower'} onClose={close} />}
                {shopMounted && <ShopModal isOpen={open === 'shop'} onClose={close} onGoHome={close} userId={userId} starBalance={starBalance} initialTab="monster" />}
                {worldMounted && (
                    <WorldFullScreen
                        isOpen={open === 'world'}
                        onClose={close}
                        onGoHome={close}
                        userId={userId}
                        starBalance={starBalance}
                        worldTheme={worldTheme}
                        onThemeChange={setThemeOverride}
                    />
                )}
            </Suspense>
            <WishQuestDialog isOpen={open === 'wish'} onClose={close} userId={userId} />
            <ExchangeRequestDialog isOpen={open === 'exchange'} onClose={close} />
        </>
    );
};
