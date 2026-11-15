/** 家長還在用預設 PIN（0000）或沒有 PIN：需要先設定新的 PIN */
export const needsPinSetup = (pin: string | null | undefined) => !pin || pin.trim() === '' || pin.trim() === '0000';
