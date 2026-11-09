import { useState } from 'react';

/**
 * 搭配 React.lazy 使用：元件第一次被打開時才掛上（才下載程式碼），之後就一直掛著。
 * 這樣關閉再打開的行為和原本「一直掛著、只切換 isOpen」完全一樣，只是延後第一次載入。
 */
export function useMountOnFirstOpen(open: boolean): boolean {
    const [mounted, setMounted] = useState(open);
    if (open && !mounted) setMounted(true);
    return mounted || open;
}
