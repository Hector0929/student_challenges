# 清除快取指南

## 問題症狀
- 按了任務完成，但顯示「任務不存在」錯誤
- 更新代碼後，網頁沒有更新
- Chrome 的 Ctrl+Shift+Delete 清除快取沒有效果
- 任務被永久 block，無法點擊

## 根本原因
應用程式使用了多種快取機制：
1. **Service Worker** - 快取整個應用程式
2. **localStorage** - 保存用戶登入資訊
3. **sessionStorage** - 保存認證狀態
4. **瀏覽器快取** - Chrome 的一般快取

## 解決方法

### 方法 1：使用應用內建清除功能 ⭐ 推薦

1. 在應用程式的任務頁面
2. 找到右上角的垃圾桶圖示 🗑️ 按鈕
3. 點擊後確認清除
4. 頁面會自動重新載入

**這個方法會清除所有快取，包括 Service Worker！**

### 方法 2：Chrome 開發者工具清除

#### 步驟：
1. 按 `F12` 打開開發者工具
2. 切換到 **Application** 分頁
3. 在左側菜單找到 **Storage** 區域
4. 點擊 **Clear site data**
5. 確保勾選：
   - ✅ Local and session storage
   - ✅ IndexedDB
   - ✅ Cache storage
   - ✅ Cookies
6. 點擊 **Clear site data** 按鈕
7. 關閉開發者工具
8. 按 `Ctrl + Shift + R` 強制刷新

#### 清除 Service Worker：
1. 在 **Application** 分頁
2. 左側菜單找到 **Service Workers**
3. 點擊每個 Service Worker 旁的 **Unregister** 按鈕
4. 刷新頁面

### 方法 3：無痕模式測試

1. 按 `Ctrl + Shift + N` 打開無痕視窗
2. 訪問網站
3. 在無痕模式下測試功能

**無痕模式不會使用任何快取，適合測試！**

### 方法 4：手動清除所有 Chrome 資料

#### 完整步驟：
1. 關閉所有 Chrome 視窗
2. 按 `Win + R`
3. 輸入：`chrome://settings/clearBrowserData`
4. 選擇：
   - 時間範圍：**不限時間**
   - 勾選：
     - ✅ Cookie 和其他網站資料
     - ✅ 快取圖片和檔案
5. 點擊 **清除資料**
6. 重新開啟 Chrome

### 方法 5：使用 Chrome 指令行參數

啟動 Chrome 時加上參數，跳過快取：

```bash
chrome.exe --disable-application-cache --disable-cache
```

或使用無快取模式：
```bash
chrome.exe --disk-cache-size=1
```

### 方法 6：終極方法 - 重設 Chrome

如果以上方法都無效：

1. 進入 `chrome://settings/reset`
2. 點擊 **重設為原始預設值**
3. 確認重設

⚠️ **注意：這會清除所有 Chrome 設定！**

## 驗證快取已清除

開啟開發者工具（F12），在 Console 中執行：

```javascript
// 檢查 localStorage
console.log('localStorage:', localStorage);

// 檢查 sessionStorage
console.log('sessionStorage:', sessionStorage);

// 檢查 Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('Service Workers:', regs);
});

// 檢查快取
caches.keys().then(keys => {
    console.log('Cache names:', keys);
});
```

如果都返回空值或空陣列，表示快取已清除。

## 開發時防止快取問題

### 1. 停用 Service Worker（開發環境）

在 `main.tsx` 中註解掉 Service Worker 註冊：

```typescript
// Register Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // 只在生產環境啟用
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      // ...
  });
}
```

### 2. Chrome 開發者工具設定

1. 打開 `F12` 開發者工具
2. 切換到 **Network** 分頁
3. 勾選 **Disable cache** (在工具列上方)
4. 保持開發者工具開啟狀態進行開發

### 3. 使用 Hard Refresh

- Windows: `Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

## 常見問題

### Q: 為什麼 Ctrl+Shift+Delete 沒效？
A: Service Worker 的快取不會被這個操作清除，需要手動在開發者工具中 unregister。

### Q: 清除快取後需要重新登入嗎？
A: 是的，因為 localStorage 也會被清除，用戶資訊會遺失。

### Q: 如何永久停用 Service Worker？
A: 在 `main.tsx` 中完全移除 Service Worker 註冊代碼，或加上環境判斷只在生產環境啟用。

### Q: 無痕模式可以測試嗎？
A: 可以！無痕模式不會使用快取，非常適合測試。

## 預防措施

### 1. 更新 Service Worker 版本號
每次部署時更新 `sw.js` 中的 `CACHE_NAME`：
```javascript
const CACHE_NAME = 'daily-questmon-v4'; // 遞增版本號
```

### 2. 使用網路優先策略
在 Service Worker 中優先使用網路請求，快取作為後備。

### 3. 定期清理
建議用戶每週清除一次快取，或在遇到問題時立即清除。

## 技術說明

### Service Worker 快取機制
- **優點**：離線可用、加快載入速度
- **缺點**：可能導致更新不及時
- **策略**：Network-First（網路優先）平衡兩者

### localStorage 使用
- 存儲用戶 ID 和基本資料
- 不會過期，需手動清除
- 大小限制：~5-10MB

### sessionStorage 使用
- 存儲臨時認證狀態
- 關閉分頁自動清除
- 適合敏感資訊

## 結論

如果遇到快取問題：
1. ⭐ 先試應用內建的清除按鈕（🗑️）
2. 如果不行，使用開發者工具完整清除
3. 還不行就用無痕模式測試
4. 最後手段：重設 Chrome

記住：**開發時保持開發者工具開啟並勾選 "Disable cache"**！
