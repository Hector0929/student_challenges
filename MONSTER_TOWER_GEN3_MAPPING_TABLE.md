# 怪獸塔 Gen3 映射表 v0.1

## 1. 目標
本表定義「現有怪獸資料」如何轉換為 Gen3 可用的編隊、戰鬥、養成資料。

適用來源：
- tower_progress.monsters_collected
- world_inventory.monster_shards
- monster_shop_items
- MONSTERS 常數（怪獸 ID、zone、unlockFloor、isEvolved）

## 2. 資料欄位映射（舊 -> 新）
| 舊來源 | 舊欄位 | 新資料表 | 新欄位 | 轉換規則 |
| --- | --- | --- | --- | --- |
| tower_progress | user_id | monster_gen3_owned | user_id | 直接帶入 |
| tower_progress | monsters_collected[] | monster_gen3_owned | owned_monster_ids[] | 去重後寫入 |
| tower_progress | monsters_collected[] | monster_gen3_profile | copies | 每個 monster_id 計數 |
| world_inventory | monster_shards | monster_gen3_wallet | shard_balance | 1:1 帶入 |
| monster_shop_items | family_id | monster_gen3_shop_rotation | family_id | 直接帶入 |
| monster_shop_items | monster_id | monster_gen3_shop_rotation | monster_id | 直接帶入 |
| monster_shop_items | price | monster_gen3_shop_rotation | star_price | 至少為 1 |
| monster_shop_items | is_enabled | monster_gen3_shop_rotation | is_enabled | 直接帶入 |
| MONSTERS | zone | monster_gen3_profile | faction | zone 對照陣營表 |
| MONSTERS | unlockFloor | monster_gen3_profile | unlock_tier | 依樓層區間映射 |
| MONSTERS | isEvolved | monster_gen3_profile | awaken_stage | true -> 1, false -> 0 |

## 3. 區域與陣營映射
| MONSTERS.zone | Gen3 faction |
| --- | --- |
| 森林入口 | forest |
| 水晶洞穴 / 水晶洞窟 | crystal |
| 熔岩地帶 | magma |
| 雲端天空 | sky |
| 外太空 | cosmos |
| 塔頂 | apex |
| 抽獎限定 | limited |
| 進化限定 | ascended |

## 4. unlockFloor -> unlock_tier 映射
| unlockFloor | unlock_tier | 說明 |
| --- | --- | --- |
| <= 25 | T1 | 新手期可獲取 |
| 26-50 | T2 | 中前期 |
| 51-75 | T3 | 中期 |
| 76-100 | T4 | 後期 |
| > 100 | T5 | 限定或進化內容 |

## 5. 怪獸戰鬥定位映射（首版）
| monster_id | Gen3 role | 副標籤 |
| --- | --- | --- |
| slime | guardian | sustain |
| wind_slime | controller | slow |
| mossy_golem | guardian | shield |
| mushroom_kin | support | heal |
| nian_beast | bruiser | counter |
| water_spirit | support | cleanse |
| mystic_water | controller | freeze |
| ice_cube_slime | guardian | armor |
| penguin_knight | striker | combo |
| valentine_diamond | support | crit_buff |
| flame_bird | striker | burst |
| phoenix_chick | striker | execute |
| magma_blob | guardian | taunt |
| demon_imp | controller | burn |
| cactus_boy | breaker | anti_armor |
| sand_castle_crab | guardian | reflect |
| thunder_cloud | controller | stun |
| storm_lord | breaker | chain_lightning |
| cloud_puff | support | energy_regen |
| star_bit | striker | true_damage |
| ufo_rider | breaker | displacement |
| moon_bunny | support | speed_up |
| rainbow_dragon | striker | aoe |
| gold_mimic | support | loot_bonus |
| star_fairy | support | shield_overflow |
| lucky_clover | support | luck |
| evolved_slime | guardian | apex |
| evolved_water_spirit | support | apex |
| evolved_flame_bird | striker | apex |
| evolved_thunder_cloud | controller | apex |
| evolved_rainbow_dragon | striker | apex_boss |
| evolved_star_fairy | support | apex |
| evolved_lucky_clover | support | apex |
| evolved_gold_mimic | support | apex_economy |
| evolved_ufo_rider | breaker | apex |

## 6. 舊進化資料映射
來源：EVOLUTION_MAP（5 -> 1 合成）

Gen3 轉換規則：
- base 怪獸 copies >= 5 且有對應 evolved_id：
  - evolved 怪獸 awaken_stage 至少為 1
  - base 扣除 5 份，轉為 evolved 1 份
- 已持有 evolved 怪獸者：
  - 直接保留 evolved 擁有狀態
  - 額外重複 evolved 轉為 ascended_shards

## 7. 初始戰力映射公式
每隻怪獸初始屬性：
- base_hp = role_base_hp * (1 + 0.08 * awaken_stage)
- base_atk = role_base_atk * (1 + 0.06 * awaken_stage)
- base_spd = role_base_spd

舊收藏加成：
- copy_bonus = min(0.25, 0.03 * (copies - 1))
- final_stat = base_stat * (1 + copy_bonus)

## 8. 玩家是否能在 Gen3 獲得新怪獸：可以
Gen3 建議保留舊獲取方式，並新增以下管道：

1. 塔內首通蛋
- 每個層段 Boss 首通必掉對應陣營蛋。
- 已擁有時改掉碎片與覺醒石。

2. 賽季裂縫池
- 每個賽季提供 2 到 4 隻新怪。
- 賽季結束後進常駐池或紀念池。

3. 碎片合成
- 以 monster_shards + 層段素材合成指定怪獸。
- 保底機制：連續 N 次未出目標時提升機率。

4. 家庭商店輪替
- 家長可設定當期上架怪獸與價格。
- 每週輪替一次，保留家庭自訂彈性。

5. 節慶限定活動
- 例如新年、情人節、暑假活動怪。
- 活動結束後改為稀有掉落，不直接絕版。

## 9. 上線轉換策略（避免資產爭議）
1. 先做 dry-run 報表
- 每位玩家列出：舊持有、轉換後持有、碎片餘額。

2. 再做正式 migration
- 先寫入備份表 monster_gen3_migration_backup。
- 成功後再寫入正式表。

3. 提供 7 天回滾窗口
- 可依 user_id 回寫舊資料，避免誤轉換。

## 10. 最小 SQL 表建議
- monster_gen3_owned(user_id, owned_monster_ids, updated_at)
- monster_gen3_profile(user_id, monster_id, copies, role, faction, unlock_tier, awaken_stage, talent_seed)
- monster_gen3_wallet(user_id, shard_balance, ascended_shards, updated_at)
- monster_gen3_shop_rotation(family_id, monster_id, star_price, is_enabled, starts_at, ends_at)
- team_presets(user_id, preset_name, main_slots, bench_slots, updated_at)
