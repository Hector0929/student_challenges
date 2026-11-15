/** 清除這台裝置上這個網站的資料：localStorage、sessionStorage、Service Worker 快取，然後回到首頁 */
export async function clearDeviceData() {
    try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
        }
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch (error) {
        console.error('清除裝置資料時發生錯誤:', error);
    } finally {
        window.location.href = '/';
    }
}
