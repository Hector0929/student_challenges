import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Home, Landmark, Store, Star } from 'lucide-react';
import { ChildMonsterShop } from './ChildMonsterShop';
import { StarBank } from './StarBank';
import { useGameWindowController } from '../hooks/useGameWindowController';
import { formatStars } from '../lib/formatStars';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoHome?: () => void;
    userId: string;
    starBalance: number;
    /** monster：怪獸商店街；bank：星幣銀行 */
    mode?: 'monster' | 'bank';
}

export const ShopModal: React.FC<ShopModalProps> = ({
    isOpen,
    onClose,
    onGoHome,
    userId,
    starBalance,
    mode = 'monster',
}) => {
    const { handleEndGame, handleGoHome } = useGameWindowController({
        isOpen,
        isImmersivePhase: isOpen,
        onClose,
        onGoHome,
    });

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

    const isBank = mode === 'bank';
    const title = isBank ? '星幣銀行' : '怪獸商店街';
    const subtitle = isBank ? '把用不到的星幣存起來，每天都會長一點利息。活存隨時可以領；定存要放滿天數，利息比較多，提早解約會被扣一點點喔。' : '用星幣帶怪獸夥伴回家，打造你的隊伍。';
    const TitleIcon = isBank ? Landmark : Store;

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
                        <span className="font-heading text-indigo-900 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[240px] flex items-center gap-2">
                            <TitleIcon size={16} />
                            {title}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 border-2 border-yellow-300">
                        <Star size={16} className="text-yellow-500" fill="currentColor" />
                        <span className="font-heading text-sm text-amber-700">{formatStars(starBalance)}</span>
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
                    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${isBank ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-indigo-200 bg-indigo-50 text-indigo-900'}`}>
                        {subtitle}
                    </div>

                    {isBank ? <StarBank userId={userId} starBalance={starBalance} /> : <ChildMonsterShop userId={userId} starBalance={starBalance} inModal />}
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalTree, document.body) : modalTree;
};
