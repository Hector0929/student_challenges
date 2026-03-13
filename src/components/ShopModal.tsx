import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Home, Store, Star } from 'lucide-react';
import { ChildMonsterShop } from './ChildMonsterShop';
import { ChildWorldShopStreet } from './ChildWorldShopStreet';
import { useGameWindowController } from '../hooks/useGameWindowController';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoHome?: () => void;
    userId: string;
    starBalance: number;
    initialTab?: 'monster' | 'world';
}

export const ShopModal: React.FC<ShopModalProps> = ({
    isOpen,
    onClose,
    onGoHome,
    userId,
    starBalance,
    initialTab = 'monster',
}) => {
    const [activeTab, setActiveTab] = React.useState<'monster' | 'world'>(initialTab);
    const { handleEndGame, handleGoHome } = useGameWindowController({
        isOpen,
        isImmersivePhase: isOpen,
        onClose,
        onGoHome,
    });

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [initialTab, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.gameModalOpen;
            return;
        }

        document.body.style.overflow = 'hidden';
        document.body.dataset.gameModalOpen = 'true';

        return () => {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.gameModalOpen;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const isWorldTab = activeTab === 'world';
    const title = isWorldTab ? '世界商店街' : '怪獸商店街';
    const subtitle = isWorldTab ? '建材補給、資源兌換、世界銀行與定存收益都在這裡。' : '用星幣帶怪獸夥伴回家，打造你的隊伍。';

    const modalTree = (
        <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[1px] p-0 sm:p-3">
            <div className="w-full h-full sm:max-w-5xl sm:mx-auto sm:h-[calc(100dvh-1.5rem)] bg-indigo-50 flex flex-col overflow-hidden">
                <div className="bg-white border-b-4 border-indigo-100 p-2 sm:p-3 flex items-center justify-between shadow-sm shrink-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={handleEndGame}
                            className="p-2 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                            aria-label="返回"
                            title="返回"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <span className="font-pixel text-indigo-900 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[240px] flex items-center gap-2">
                            <Store size={16} />
                            {title}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 border-2 border-yellow-300">
                        <Star size={16} className="text-yellow-500" fill="currentColor" />
                        <span className="font-pixel text-sm text-amber-700">{starBalance}</span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={handleGoHome}
                            className="p-2 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            aria-label="回首頁"
                            title="回首頁"
                        >
                            <Home size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${isWorldTab ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-indigo-200 bg-indigo-50 text-indigo-900'}`}>
                        {subtitle}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('monster')}
                            className={`px-4 py-2 rounded-xl border-2 font-heading font-bold text-sm ${activeTab === 'monster' ? 'bg-indigo-500 text-white border-indigo-700' : 'bg-white text-indigo-700 border-indigo-200'}`}
                        >
                            👾 怪獸商店
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('world')}
                            className={`px-4 py-2 rounded-xl border-2 font-heading font-bold text-sm ${activeTab === 'world' ? 'bg-emerald-500 text-white border-emerald-700' : 'bg-white text-emerald-700 border-emerald-200'}`}
                        >
                            🏬 世界商店街
                        </button>
                    </div>

                    {activeTab === 'monster' ? (
                        <ChildMonsterShop userId={userId} starBalance={starBalance} inModal />
                    ) : (
                        <ChildWorldShopStreet userId={userId} starBalance={starBalance} />
                    )}
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalTree, document.body) : modalTree;
};
