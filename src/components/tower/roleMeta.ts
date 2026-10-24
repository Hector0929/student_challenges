// 怪獸塔 V3/V4 共用：隊伍定位的顯示資訊與夥伴出手演出的配色
import type React from 'react';
import { Crosshair, Hammer, Heart, Shield, Zap } from 'lucide-react';
import type { TeamEffectDetail } from '../../hooks/useTowerProgress';
import type { TeamRole } from '../../lib/towerGen3Rules';

export const ROLE_META: Record<TeamRole, { label: string; icon: React.FC<{ size?: number; className?: string }>; color: string }> = {
    guardian: { label: '守護', icon: Shield, color: 'text-emerald-400' },
    striker: { label: '輸出', icon: Zap, color: 'text-amber-400' },
    controller: { label: '控場', icon: Crosshair, color: 'text-purple-400' },
    support: { label: '支援', icon: Heart, color: 'text-rose-400' },
    breaker: { label: '破甲', icon: Hammer, color: 'text-orange-400' },
};

// ── 隊伍出手演出：明確告訴玩家「是哪一隻怪獸幫了忙、幫了多少」 ──
export const TEAM_EFFECT_THEME: Record<TeamEffectDetail['kind'], { ring: string; glow: string; badge: string; badgeText: string; accent: string; icon: string }> = {
    trap_shield: {
        ring: 'border-emerald-400/70',
        glow: 'rgba(52, 211, 153, 0.55)',
        badge: 'bg-emerald-500/20 border-emerald-400/50',
        badgeText: 'text-emerald-200',
        accent: 'from-emerald-200 via-teal-100 to-emerald-300',
        icon: '🛡️',
    },
    ladder_boost: {
        ring: 'border-cyan-400/70',
        glow: 'rgba(34, 211, 238, 0.55)',
        badge: 'bg-cyan-500/20 border-cyan-400/50',
        badgeText: 'text-cyan-200',
        accent: 'from-cyan-200 via-sky-100 to-cyan-300',
        icon: '🌀',
    },
    monster_bonus: {
        ring: 'border-amber-400/70',
        glow: 'rgba(251, 191, 36, 0.55)',
        badge: 'bg-amber-500/20 border-amber-400/50',
        badgeText: 'text-amber-200',
        accent: 'from-amber-200 via-yellow-100 to-orange-300',
        icon: '⚡',
    },
};
