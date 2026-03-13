# 懸空島世界系統 SDD / TDD 開發規劃

## 1. 文件目的
本文件定義「孩子可擴建的懸空島世界」的完整產品規格、系統邊界、資料流、分階段開發策略，以及對應的 TDD 測試方法。

本輪目標不是直接全面開發，而是先建立一致的規格，確保後續功能都依照同一套語言與驗收標準前進。

---

## 2. 產品願景

### 核心願景
讓孩子透過完成任務、遊玩遊戲、經營地塊與角色成長，逐步建造一個「屬於自己的活世界」。

### 設計原則
- 世界要有「成長感」：看到島嶼、建築、地塊、角色一直變化
- 資源要有「循環感」：木材、石材、晶礦、星幣形成閉環
- 遊戲要有「目的感」：不是只拿獎勵，而是回到世界中產生影響
- 系統要有「長線感」：孩子每天回來都有事情做，但不必一次做很多
- 開發要有「可驗證性」：先在 Debug 頁面驗證，再逐步正式接主流程

---

## 3. 現況盤點

### 已存在能力
- 任務系統：`quests` / `daily_logs`
- 星幣系統：`star_transactions` + `get_child_star_balance`
- 怪獸塔與骰子系統：`useTowerProgress`
- Fun games：`RewardTime` + `GameModal`
- 3D 世界原型：`src/components/World3D.tsx`
- Debug 驗證頁：`src/pages/DebugPage.tsx`

### 已完成原型能力
- 主島與側邊小島視覺化
- 建築升級外觀變化
- 白天 / 黃昏切換
- 功能地塊概念化
- 工人 / 精靈與資源搬運動畫
- 地塊選取與詳細資訊卡

### 尚未正式化的部分
- 真實資料表與持久化
- 地塊操作行為（升級、指派、加速、派遣）
- 冒險地塊真正的玩法流程
- 商店街與地塊之間的真實經濟串接
- 倉儲上限 / 離線收益上限規則

---

## 4. 核心系統地圖

### 世界主循環
1. 完成任務 / 小遊戲 / 怪獸塔
2. 獲得星幣 / 建材 / 怪獸碎片 / 探索資源
3. 回到懸空島升級建築與角色
4. 地塊持續自動產出
5. 透過商業地塊與商店街轉換為下一輪成長資本

### 核心資源
- 星幣：通用貨幣，接現有系統
- 木材：主要建設資源
- 石材：中階建設資源
- 晶礦：進階資源，偏角色/高階建築用途
- 怪獸碎片：冒險與怪獸相關成長資源（Phase 2 之後）

### 核心成長軸
- 島嶼等級：解鎖更多地塊 / 視覺擴建
- 建築等級：提升產量、效率、玩法功能
- 角色等級：提升戰力、派遣能力、未來職業系統
- 地塊解鎖：拓展玩法維度

---

## 5. 功能地塊規格

## 5.1 商業地塊
### 定位
可將資源轉成星幣，並作為商店街與市場經濟入口。
可實作儲蓄的概念，可分為定存或是活存，以日利率來計算。

### 功能
- 把木材 / 石材 / 晶礦兌換成星幣
- 影響交易倍率
- 解鎖每日商品 / 折扣商品 / 稀有商品
- 解鎖建材包、加速券、功能道具
- 建立儲蓄的系統，儲存之後要成功扣除星幣，解儲存之後能成功加回星幣

### 商店街整合架構（新增）
商業地塊正式整合為「商店街」入口，拆成 3 個子店：
- 怪獸店：沿用現有 monster shop 結構，提供孩子使用星幣購買怪獸
- 兌換店：顯示木材 / 石材 / 晶礦單價，孩子自行決定賣出數量
- 銀行：提供活存 / 定存，並由家長設定日利率

### 子店規格（新增）
#### 怪獸店
- 使用家庭共用商品池
- 家長可設定上架怪獸、價格、是否啟用
- 孩子購買時消耗自己的星幣，取得自己的怪獸收藏

#### 兌換店
- 顯示木材 / 石材 / 晶礦當前單價
- 孩子可自行輸入欲賣出數量
- 賣出數量不得大於目前擁有數量
- 最終售價 = 家庭基準單價 × 商業地塊倍率
- 賣出後需同步扣除世界資源並新增星幣交易紀錄

#### 銀行
- 活存：可隨存隨領，採較低日利率
- 定存：建立時鎖定本金、利率與到期日
- 家長可設定活存 / 定存日利率
- 可設定提前解約規則（不給利息或違約金）

### 升級效果
- Lv1：基本兌換
- Lv2：兌換倍率提升
- Lv3：解鎖每日折扣
- Lv4：解鎖稀有商品
- Lv5+：提升運輸效率、交易冷卻縮短

### 驗收標準
- 商業地塊等級會影響星幣兌換公式
- 商品池會依等級擴張
- 商店街資料能被 Debug 頁模擬並顯示
- 怪獸店 / 兌換店 / 銀行可共用同一個商店街入口
- 兌換店不得超賣目前資源
- 銀行利率由家長設定後能正確影響活存與定存收益

---

## 5.2 訓練地塊
### 定位
角色養成與全島效率增益中心。

### 功能
- 提升角色屬性：生命 / 攻擊 / 移動 / 技能點
- 提供全島 buff，例如資源產量加成
- 預留職業系統：冒險家 / 工匠 / 商人

### 升級效果
- Lv1：解鎖角色等級顯示
- Lv2：全島產量 +5%
- Lv3：解鎖技能點系統
- Lv4：解鎖職業分支
- Lv5+：全域效率 buff 疊加

### 驗收標準
- 訓練地塊會影響 `worldRates`
- 角色等級提升時能反映在世界 UI
- 後續可與冒險/遊戲 buff 串接

---

## 5.3 倉儲地塊
### 定位
管理所有地塊的資源容量、離線收益上限與搬運效率。

### 功能
- 設定木材 / 石材 / 晶礦的容量上限
- 提高離線累積的可儲存量
- 作為中央結算中心
- 提升搬運效率與回收速度

### 升級效果
- Lv1：基礎容量
- Lv2：離線收益上限提升
- Lv3：搬運速度加成
- Lv4：資源爆倉保護
- Lv5+：解鎖自動整理 / 分類加成

### 驗收標準
- 離線計算要受倉儲容量影響
- 資源結算要能經過倉儲規則
- Debug 頁可看到容量與上限資訊

---

## 5.4 冒險地塊
### 定位
世界地圖入口，先從「派遣系統 + 事件探索」開始，後續接現有遊戲。

### 第一階段玩法：派遣系統 + 事件探索
#### 派遣模式
- 30 分鐘：短途採集
- 2 小時：一般探索
- 8 小時：長途冒險

#### 派遣回報
- 木材 / 石材 / 晶礦
- 怪獸碎片
- 稀有道具
- 事件結果（成功、失敗、小彩蛋）

#### 事件探索模式
- 寶箱
- 迷路
- 遇怪
- 特殊 NPC
- 稀有天氣 / 地區事件

### 第二階段玩法：接現有遊戲作為冒險副本入口
- 怪獸生存戰 = 荒野探索
- 怪獸塔 = 遺跡挑戰
- 其他 fun games = 專題任務或事件玩法

### 第三階段玩法：怪獸隊伍模式
- 帶怪獸一起出征
- 怪獸提供掉寶率 / 速度 / 戰鬥力加成

### 驗收標準
- 派遣任務有開始、倒數、結束、領獎四個狀態
- 事件會影響回報
- 冒險結果能回寫到世界資源與角色成長

---

## 6. SDD：系統邊界與模組拆分

## 6.1 Domain Modules
- `WorldState`：島等級、建築等級、地塊解鎖、時間戳
- `WorldProduction`：即時與離線產出計算
- `WorldEconomy`：資源兌換、商店商品、價格規則
- `WorldCharacter`：角色等級、屬性、職業、技能點
- `WorldAdventure`：派遣、事件、獎勵、冷卻
- `WorldStorage`：容量、離線上限、搬運效率
- `WorldExchangeShop`：手動賣出數量、價格顯示、交易紀錄
- `WorldBank`：活存、定存、利息結算、解約規則
- `WorldShopStreet`：怪獸店 / 兌換店 / 銀行入口整合與家庭設定投影

## 6.2 Frontend Modules
- `World3D.tsx`：視覺呈現與互動
- `WorldLabPanel.tsx`：Debug / 後續正式版控制面板
- `WorldPlotDetail.tsx`：地塊資訊、升級、派遣入口
- `WorldAdventurePanel.tsx`：冒險地塊任務 UI
- `WorldShopPanel.tsx`：商業地塊商品與資源兌換
- `WorldMonsterShopPanel.tsx`：怪獸店分頁
- `WorldExchangePanel.tsx`：手動賣出資源、即時計價與確認交易
- `WorldBankPanel.tsx`：活存 / 定存建立、提領、收益顯示

## 6.3 Data Modules
建議新增：
- `world_states`
- `world_buildings`
- `world_plots`
- `world_characters`
- `world_adventures`
- `world_inventory`
- `world_shop_rotations`
- `family_exchange_rates`
- `family_bank_settings`
- `world_bank_accounts`
- `world_time_deposits`
- `world_exchange_logs`

---

## 7. 資料模型草案

## 7.1 `world_states`
- `user_id`
- `island_level`
- `time_of_day_pref`
- `last_collected_at`
- `created_at`
- `updated_at`

## 7.2 `world_buildings`
- `user_id`
- `building_key` (`forest` / `mine` / `academy` / `market` / `storage` / `adventure`)
- `level`
- `worker_count`
- `assigned_plot_key`
- `updated_at`

## 7.3 `world_inventory`
- `user_id`
- `wood`
- `stone`
- `crystal`
- `monster_shards`
- `updated_at`

## 7.4 `world_characters`
- `user_id`
- `level`
- `power`
- `hp_bonus`
- `atk_bonus`
- `move_bonus`
- `skill_points`
- `job_class`

## 7.5 `world_adventures`
- `id`
- `user_id`
- `mission_type`
- `duration_minutes`
- `status` (`idle` / `running` / `completed` / `claimed`)
- `started_at`
- `ends_at`
- `result_payload`

## 7.6 `family_exchange_rates`
- `family_id`
- `wood_price`
- `stone_price`
- `crystal_price`
- `updated_by`
- `updated_at`

## 7.7 `family_bank_settings`
- `family_id`
- `demand_daily_rate`
- `time_deposit_daily_rate`
- `min_time_deposit_days`
- `early_withdraw_penalty_rate`
- `updated_by`
- `updated_at`

## 7.8 `world_bank_accounts`
- `user_id`
- `demand_balance`
- `last_interest_at`
- `updated_at`

## 7.9 `world_time_deposits`
- `id`
- `user_id`
- `principal`
- `daily_rate`
- `start_at`
- `matures_at`
- `status` (`active` / `matured` / `claimed` / `cancelled`)
- `claimed_amount`
- `updated_at`

## 7.10 `world_exchange_logs`
- `id`
- `user_id`
- `wood_sold`
- `stone_sold`
- `crystal_sold`
- `unit_prices`
- `market_multiplier`
- `stars_earned`
- `created_at`

---

## 8. Phase 規劃

## Phase A：Debug 原型正式化
### 範圍
- 世界資料表建立
- 真實讀寫 Hook
- 產出公式模組化
- 商業 / 訓練 / 倉儲 / 冒險四地塊規則落地
- 冒險地塊第一版：派遣 + 事件

### 不做
- 怪獸隊伍
- 複雜戰鬥模擬
- 正式主頁完整整合

### 驗收
- Debug 頁可以完整操作世界系統
- 重新整理後資料不消失
- 有基本測試保護

## Phase B：接正式頁與商店街
### 範圍
- 接主頁入口
- 商店街每日商品輪替
- 建材包 / 加速券 / 稀有商品
- 倉儲上限與離線收益完整化
- 商店街三子店整合（怪獸店 / 兌換店 / 銀行）
- 家長設定兌換價格與銀行利率
- 孩子端手動賣出數量與銀行存提流程

## Phase C：冒險與遊戲整合
### 範圍
- 冒險地塊接現有遊戲作為副本入口
- 怪獸塔與派遣連動
- 怪獸隊伍與加成系統

---

## 9. TDD 開發策略

## 9.1 原則
每一個世界規則都必須先以純函數/可測模組定義，再實作 UI。

### 開發順序
1. 寫 spec（需求、輸入、輸出、邊界）
2. 先寫 failing tests
3. 實作最小可通過版本
4. refactor
5. 再接 UI

---

## 9.2 測試層級

### A. Domain Unit Tests（優先）
目標：測核心規則，不依賴 React UI。

建議新增：
- `src/__tests__/worldProduction.test.ts`
- `src/__tests__/worldEconomy.test.ts`
- `src/__tests__/worldStorage.test.ts`
- `src/__tests__/worldAdventure.test.ts`
- `src/__tests__/worldCharacter.test.ts`

#### 測試主題
- 產出公式是否正確
- 地塊升級後產量是否變化
- 倉儲容量是否正確限制離線收益
- 商業地塊兌換公式是否正確
- 派遣任務完成時是否回傳預期資源
- 隨機事件是否落在可接受結果範圍
- 兌換店不得超賣目前持有資源
- 銀行活存 / 定存利息計算是否正確
- 家庭價格 / 利率設定是否正確投影到孩子端商店街

### B. Hook / Integration Tests
目標：測 Hook 與資料整合。

建議新增：
- `src/__tests__/useWorldState.test.ts`
- `src/__tests__/useWorldAdventure.test.ts`
- `src/__tests__/useWorldShopStreet.test.ts`
- `src/__tests__/useWorldBank.test.ts`

#### 測試主題
- 建築升級後 state 是否更新
- 冒險開始/完成/領取是否變更正確狀態
- 重新抓資料時是否能恢復進度
- 商店街讀取家庭設定後是否正確顯示價格與利率
- 定存建立 / 到期 / 領取後是否正確同步資料

### C. Component Tests
目標：測 Debug UI 的互動流程。

建議新增：
- `src/__tests__/WorldLabPanel.test.tsx`
- `src/__tests__/WorldAdventurePanel.test.tsx`
- `src/__tests__/WorldExchangePanel.test.tsx`
- `src/__tests__/WorldBankPanel.test.tsx`
- `src/__tests__/WorldShopPanel.test.tsx`

#### 測試主題
- 點選地塊是否切換詳細面板
- 升級按鈕是否觸發正確流程
- 派遣按鈕是否進入倒數狀態
- 黃昏 / 白天切換是否反映 UI 狀態
- 輸入賣出數量時不得超過庫存
- 銀行定存建立後顯示到期資訊與預估收益
- 商店街 tabs 能切換怪獸店 / 兌換店 / 銀行

---

## 9.3 第一批必寫測試（MVP）

### `worldProduction.test.ts`
- [ ] `forest` 等級提升會提高木材產量
- [ ] `mine` 等級提升會提高石材產量
- [ ] `academy` 等級提升會提高全局倍率
- [ ] `islandLevel` 提高會提高晶礦與地塊解鎖

### `worldEconomy.test.ts`
- [ ] 商業地塊等級影響兌換倍率
- [ ] 資源為 0 時不得產生星幣
- [ ] 資源兌換後庫存清空或正確扣除

### `worldStorage.test.ts`
- [ ] 離線收益不得超過容量上限
- [ ] 倉儲升級後容量增加

### `worldAdventure.test.ts`
- [ ] 派遣任務會建立正確結束時間
- [ ] 任務完成前不能領取
- [ ] 任務完成後可領取資源
- [ ] 事件結果會改變回報

### `WorldLabPanel.test.tsx`
- [ ] 點選地塊卡與 3D 地塊會同步切換選取
- [ ] 解鎖不足的地塊不能執行動作

### `worldExchangeShop.test.ts`
- [ ] 賣出數量不得大於目前持有資源
- [ ] 不同資源價格可正確計算總星幣
- [ ] 商業地塊倍率會影響最終售價

### `worldBank.test.ts`
- [ ] 活存利息會依日利率與天數正確增加
- [ ] 定存到期後可領回本金加利息
- [ ] 提前解約會依規則扣除利息或違約金

### `WorldExchangePanel.test.tsx`
- [ ] 數量輸入不得超過目前庫存
- [ ] 顯示即時預估收入

### `WorldBankPanel.test.tsx`
- [ ] 可建立活存 / 定存
- [ ] 定存卡片顯示到期日與預估收益

---

## 10. 開發順序建議（嚴格照 TDD）

### Sprint 1：世界規則核心
1. 建立 `src/lib/world/production.ts`
2. 建立 `src/lib/world/economy.ts`
3. 建立 `src/lib/world/storage.ts`
4. 先寫上述 3 個測試檔
5. 完成純函數實作

### Sprint 2：冒險核心
1. 建立 `src/lib/world/adventure.ts`
2. 寫 `worldAdventure.test.ts`
3. 完成派遣 / 事件 / 結算規則

### Sprint 3：Hook 與狀態
1. 建立 `useWorldState`
2. 建立 `useWorldAdventure`
3. 寫 hook tests

### Sprint 4：Debug UI
1. 把 Debug 頁的 local state 改成 Hook 驅動
2. 寫 component tests
3. 補齊地塊動作按鈕

### Sprint 5：資料庫整合
1. 建 migration
2. 建 RPC 或直接 CRUD 策略
3. 加入 integration tests

### Sprint 6：兌換店核心
1. 建立 `src/lib/world/exchangeShop.ts`
2. 寫 `worldExchangeShop.test.ts`
3. 完成手動賣出數量、價格計算、不可超賣規則
4. 接 `world_exchange_logs` 與星幣交易紀錄

### Sprint 7：銀行核心
1. 建立 `src/lib/world/bank.ts`
2. 寫 `worldBank.test.ts`
3. 完成活存 / 定存 / 到期 / 解約規則
4. 定義 `family_bank_settings`、`world_bank_accounts`、`world_time_deposits` migration

### Sprint 8：商店街家庭設定
1. 建立 `family_exchange_rates` 與 `family_bank_settings` hooks
2. 接入 `ParentSettings` 讓家長設定價格與日利率
3. 寫 settings 與 hooks tests

### Sprint 9：商店街 UI 整合
1. 建立 `WorldShopPanel`
2. 整合怪獸店 / 兌換店 / 銀行 tabs
3. 寫 component tests
4. 在 Debug 頁與商業地塊詳細面板中接入

### Sprint 10：正式頁整合與輪替
1. 將商店街入口接正式孩子頁
2. 加入每日商品輪替 / 折扣商品 / 稀有商品
3. 補 integration tests 與使用者驗證清單

---

## 11. 驗收標準（Definition of Done）
- 有對應 spec 段落
- 有先寫測試
- 測試先失敗再通過
- UI 不直接埋商業規則，規則來自可測模組
- Debug 頁可手動驗證流程
- 不破壞現有星幣、任務、怪獸塔系統

---

## 12. 第一個開發切片（建議立刻開始）
建議第一個真正進入 TDD 的切片為：

### 切片名稱
`商業地塊 + 倉儲容量 + 派遣最小骨架`

### 範圍
- 完成資源產出公式
- 完成商業地塊兌換公式
- 完成倉儲容量限制
- 完成 30 分鐘派遣任務最小狀態機

### 原因
- 可直接驗證資源循環
- 與現有星幣系統整合最順
- 風險低、價值高
- 容易先寫測試

---

## 13. 本輪結論
我們後續的正式開發流程應為：

1. 先在 Debug 頁驗證世界行為
2. 用 SDD 固定規則與驗收標準
3. 用 TDD 先完成 domain rules
4. 再把 UI / Hook / DB 一層層接上
5. 最後才整合回正式孩子主頁

這樣可以最大幅度降低世界系統越做越亂的風險。
