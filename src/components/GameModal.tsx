import React from 'react';
import { X } from 'lucide-react';
import { RPGDialog } from './RPGDialog';

interface GameModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUrl: string;
    gameName: string;
}

export const GameModal: React.FC<GameModalProps> = ({ isOpen, onClose, gameUrl, gameName }) => {
    return (
        <RPGDialog
            isOpen={isOpen}
            onClose={onClose}
            title={`🎮 ${gameName}`}
        >
            <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                <iframe
                    src={gameUrl}
                    className="w-full h-full border-none"
                    title={gameName}
                    allow="fullscreen"
                    scrolling="no"
                    style={{
                        overflow: 'hidden',
                        display: 'block',
                    }}
                />
            </div>
            <div className="mt-4 text-center">
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-pokeball-red text-white border-2 border-deep-black hover:brightness-110 transition-all font-pixel text-sm"
                >
                    <div className="flex items-center gap-2 justify-center">
                        <X size={16} />
                        <span>關閉遊戲</span>
                    </div>
                </button>
            </div>
        </RPGDialog>
    );
};
