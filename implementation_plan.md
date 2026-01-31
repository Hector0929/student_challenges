# 遊戲優化實作計畫

## 優化目標

根據用戶反饋，需要優化以下 4 個遊戲：

### 1. 貪食蛇 (snake_game.html) - 放大尺寸
**問題**：遊戲畫面太小，難以觀看
**解決方案**：
- 增大 `TILE_COUNT` 從 25 改為 15 (每格變大)
- 增大行動按鈕尺寸從 60px 改為 80px
- 調整 canvas 最小高度確保可見性

### 2. 下樓梯 (ns_shaft.html) - 改為方塊風格
**問題**：角色是圓形，與其他方塊遊戲風格不一致
**解決方案**：
- 將角色從圓形改為方塊 (使用 fillRect)
- 加入像素化眼睛
- 維持霓虹發光效果
- 風格參考：方塊跑酷 (Geometry Dash 風格)

### 3. 記憶矩陣 (memory_matrix.html) - 修正可視範圍
**問題**：某些卡片超出視窗，無法點擊
**解決方案**：
- 調整 grid 最大寬度為視窗寬度
- 確保 aspect-ratio 不會導致溢出
- 減小間距 gap 從 0.75rem 改為 0.5rem
- 添加 overflow 保護
- 限制最大關卡數

### 4. 2048 (2048_cyber.html) - 加入手機控制
**問題**：手機上沒有方向鍵，無法操作
**解決方案**：
- ✅ 已有 swipe 支援 (確認有效)
- ✅ 已有鍵盤支援
- 加入可視化的方向按鈕 (D-Pad)
- 參考俄羅斯方塊的控制方式

---

## 設計規範

### 共通風格
- **字體**: Orbitron (科技感)
- **主色調**: Cyan (#22d3ee) / Purple (#e879f9)
- **發光效果**: box-shadow + text-shadow
- **背景**: 深色 (#050510 ~ #0f0f15)

### D-Pad 按鈕規範 (方向控制)
```css
.d-pad-btn {
    width: 80px;
    height: 80px;
    background: rgba(34, 211, 238, 0.15);
    border: 2px solid rgba(34, 211, 238, 0.4);
    border-radius: 12px;
    font-size: 32px;
    color: #22d3ee;
    transition: all 0.1s;
}

.d-pad-btn:active {
    background: rgba(34, 211, 238, 0.5);
    transform: scale(0.95);
}
```

---

## 檔案修改清單

| 遊戲 | 檔案 | 修改內容 |
|------|------|----------|
| 貪食蛇 | `snake_game.html` | TILE_COUNT=15, 按鈕放大 |
| 下樓梯 | `ns_shaft.html` | 角色改為方塊 |
| 記憶矩陣 | `memory_matrix.html` | 限制 grid 尺寸, 防止溢出 |
| 2048 | `2048_cyber.html` | 新增 D-Pad 控制區 |
