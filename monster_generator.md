# 怪獸單字闖關：新怪獸產圖規格

這份文件給產圖 agent 使用：按照下面的規格產出新的怪獸圖，用來取代《怪獸單字闖關》（`public/games/word_quest.html`）後三個世界裡「同一張圖換色」的重複怪獸。

---

## 1. 輸出規格（每一張都必須符合）

| 項目 | 規格 |
|---|---|
| 格式 | PNG，RGBA，**透明背景** |
| 尺寸 | **200 × 200 px**，正方形 |
| 留白 | 角色置中，四周大約留 8–12 px 透明邊。角色不能碰到邊緣 |
| 內容 | 只有一隻角色，看得到全身。不要地面、平台、陰影、文字、邊框 |
| 存放位置 | `public/images/monsters/new/<檔名>.png`（檔名見第 4 節） |
| 原圖 | 去背前的大圖另存到 `public/images/monsters/new/_raw/<檔名>.png`，方便之後重做 |

### 去背流程
1. 產圖時要求**純白背景 `#FFFFFF`**（prompt 已經寫好）。
2. 從四個角落做 flood fill 去背，容差約 12–20。不要用全圖色彩替換，角色身上的白色高光才不會被挖空。
3. 依照不透明像素裁出外框，補成正方形並加上留白，再縮成 200×200（用 Lanczos）。
4. 檢查邊緣有沒有白邊殘留。有的話，把 alpha 收縮 1 px。

---

## 2. 風格參考圖

產每一張圖都要附上這 3 張參考圖：

- `public/images/monsters/new/mushroom_kin.png`：小型、圓潤的雜兵
- `public/images/monsters/new/demon_imp.png`：有道具和翅膀的角色
- `public/images/monsters/new/penguin_knight.png`：方塊比例和臉部畫法

風格重點：
- 等角視角（isometric），3/4 俯視角。
- 整隻角色由小方塊（voxel）組成，邊緣銳利，不要圓滑曲面。
- 柔和的棚拍光，頂面最亮，側面稍暗，不要強烈的戲劇光。
- 可愛 Q 版。眼睛是小方塊，表情友善或調皮，**不要恐怖、血腥、尖牙特寫**（使用者是國小學生）。
- 每隻角色有一個鮮明的主色，搭配 1–2 個點綴色，縮小到 56 px 也要認得出來。

---

## 3. 共用 prompt（放在每隻怪獸的描述前面）

```
Cute chibi game monster in isometric voxel art style, 3/4 view from slightly above,
built entirely from small colored cubes exactly like the reference images,
soft studio lighting (top faces brightest), simple friendly face with tiny square eyes,
kid-friendly, not scary. Single character only, centered, full body visible,
pure flat white background (#FFFFFF), no ground, no platform, no shadow, no text, no border.
Match the rendering style, cube size and proportions of the reference images,
but design a NEW original character:
```

**負面提示**（工具支援的話就加上）：
`realistic, smooth 3D, photo, blurry, gradient background, ground shadow, platform, multiple characters, text, watermark, scary, blood, sharp teeth close-up`

---

## 4. 要產的怪獸（共 10 隻，另外 1 隻選做）

每一隻都是「共用 prompt + 下面的角色描述」。

### ⚡ 雷雲小鎮（主題：時間、交通、地點）。主色偏紫、灰、黃

#### 4-1 閃電鼠 `thunder_mouse.png`（✅ 已重做並接進遊戲）
取代：雷電史萊姆（wind_slime 換色）

> 第一版太像知名卡通的黃色電氣鼠，不能使用。重做時避開以下特徵：**黃色身體、紅色或圓形腮紅、閃電形狀的尾巴、長尖耳朵**。
```
a small round hamster-like critter made of slate-blue and white cubes, a tiny copper battery pack strapped on its back
with a little glowing green charge light, short round ears, a short stubby tail with a plug-shaped tip,
a few cyan spark cubes around it, cheerful expression. Must NOT be yellow and must NOT resemble any existing cartoon or game character.
```

#### 4-2 時鐘貓頭鷹 `clock_owl.png`
取代：電光方塊（ice_cube_slime 換色）
```
a chubby purple owl whose round belly is a clock face with two hands (showing 3 o'clock),
small brass gear cubes on its wings, large round eyes with thin glasses, holding a tiny bell, wise but friendly.
```

### 🌈 彩虹神殿（主題：休閒娛樂、職業、形容詞）。主色偏粉紅、金、彩虹

#### 4-3 彩虹蝸牛 `rainbow_snail.png`
取代：彩虹蘑菇（mushroom_kin 換色）
```
a slow happy snail with a soft mint-green body and a big spiral shell striped in rainbow colors
(red, orange, yellow, green, blue, purple), two short antennae with little star tips, sleepy smile.
```

#### 4-4 氣球小狗 `balloon_pup.png`
取代：夢幻雲（cloud_puff 換色）
```
a cute puppy shaped like a twisted party balloon animal, glossy pink cubes with lighter highlights,
a small string tied to its tail floating upward, playful bouncing pose, tiny party hat.
```

#### 4-5 黃金神殿貓 `temple_cat.png`
取代：神殿蟹（sand_castle_crab 換色）
```
a sitting cat statue guardian made of golden and cream cubes, one paw raised in greeting,
a small turquoise gem on its forehead, a short red scarf, calm proud expression, looks like an ancient temple guardian toy.
```

#### 4-6 燈籠精靈 `lantern_spirit.png`
取代：黃金石像（mossy_golem 換色）
```
a floating paper-lantern spirit, body is a round red lantern with gold top and bottom caps,
warm yellow glowing cubes inside, two tiny arms, a cute face on the lantern, a short gold tassel below, no legs.
```

### 🛸 星空要塞（主題：人物、動作、小東西）。主色偏深藍、紫、銀，帶發光點綴

#### 4-7 彗星狐 `comet_fox.png`
取代：星夜小惡魔（demon_imp 換色）
```
a small fox made of deep-blue and white cubes, its fluffy tail is a glowing comet trail
fading from cyan to purple, tiny star cubes sparkling on its back, alert ears, mischievous grin, running pose.
```

#### 4-8 太空水母 `space_jelly.png`
取代：星空寶箱（gold_mimic 換色）
```
a floating jellyfish wearing a clear glass astronaut dome on its head,
translucent lavender bell made of cubes, glowing pink tentacles made of short cube chains, curious face inside the dome.
```

#### 4-9 小行星龜 `astro_turtle.png`
取代：星雲球（magma_blob 換色）
```
a sturdy little turtle whose shell is a grey cratered asteroid with small glowing blue crystal cubes,
green-teal skin, tiny rocket boosters on its back feet with small orange flame cubes, determined friendly face.
```

#### 4-10 機器人偵察兵 `robo_scout.png`
取代：銀河水妖（mystic_water 換色）
```
a small boxy scout robot made of silver and white cubes, one big round cyan visor eye,
a short antenna with a red blinking light on top, a mini radar dish on one shoulder, stubby legs, saluting pose.
```

### （選做）雷霆烏雲王 `boss_thunder_king.png`
目前雷雲小鎮的魔王和雜兵「烏雲怪」幾乎長得一樣。如果要換，這張的規格不同：**384 × 384 px**，放到 `public/images/monsters/cutout/`。
```
a big boss monster: a towering storm-cloud king made of dark slate and purple cubes,
a golden crown with lightning-bolt spikes, two cloud fists crackling with yellow electric cubes,
glowing yellow eyes, raining small blue cube drops, imposing but still cartoon-friendly. Larger and more detailed than normal monsters.
```

---

## 5. 驗收清單

每一張完成後逐項檢查：

- [ ] 200×200（魔王是 384×384），RGBA，四個角的 alpha = 0
- [ ] 沒有白邊殘留、沒有地面陰影
- [ ] 跟 3 張參考圖放在一起，方塊大小、光影和視角一致
- [ ] 縮成 56×56 還認得出是什麼角色
- [ ] 不恐怖，國小學生看了會覺得可愛
- [ ] 沒有可辨認的既有角色或品牌（不要像任何現成遊戲或卡通的角色）
- [ ] 檔名和第 4 節完全一致（小寫加底線）

---

## 6. 接進遊戲（產圖完成後再做，不屬於產圖 agent 的工作）

`public/games/word_quest.html` 的 `WORLD_MONS` 已經用新怪獸的 id 預留好位置。換圖時**只改名字、檔名，並拿掉色相參數**，id 不要動，玩家的收集紀錄才會保留：

| 世界 | 現在（換色佔位） | 換成 |
|---|---|---|
| storm | `E_("thunder_mouse", "雷電史萊姆", "wind_slime", "striker", 200)` | `E_("thunder_mouse", "閃電鼠", "thunder_mouse", "striker")`（等重做的圖） |
| storm | `E_("clock_owl", "電光方塊", "ice_cube_slime", "controller", 70)` | `E_("clock_owl", "時鐘貓頭鷹", "clock_owl", "controller")` |
| temple | `E_("rainbow_snail", "彩虹蘑菇", "mushroom_kin", "guardian", 260)` | `E_("rainbow_snail", "彩虹蝸牛", "rainbow_snail", "guardian")` |
| temple | `E_("balloon_pup", "夢幻雲", "cloud_puff", "support", 290)` | `E_("balloon_pup", "氣球小狗", "balloon_pup", "support")` |
| temple | `E_("temple_cat", "神殿蟹", "sand_castle_crab", "guardian", 170)` | `E_("temple_cat", "黃金神殿貓", "temple_cat", "guardian")` |
| temple | `E_("lantern_spirit", "黃金石像", "mossy_golem", "support", 40)` | `E_("lantern_spirit", "燈籠精靈", "lantern_spirit", "support")` |
| star | `E_("comet_fox", "星夜小惡魔", "demon_imp", "striker", 230)` | `E_("comet_fox", "彗星狐", "comet_fox", "striker")` |
| star | `E_("space_jelly", "星空寶箱", "gold_mimic", "controller", 250)` | `E_("space_jelly", "太空水母", "space_jelly", "controller")` |
| star | `E_("astro_turtle", "星雲球", "magma_blob", "guardian", 220)` | `E_("astro_turtle", "小行星龜", "astro_turtle", "guardian")` |
| star | `E_("robo_scout", "銀河水妖", "mystic_water", "breaker", 300)` | `E_("robo_scout", "機器人偵察兵", "robo_scout", "breaker")` |
| storm boss | `B_("boss_storm", …)` 用 `cutout/boss_storm.png` | 圖檔換成 `boss_thunder_king.png`（選做） |

---

## 7. 進化型（✅ 已全部完成並接進遊戲，進化名在 word_quest.html 的 `EVO_NAMES`）

遊戲裡的怪獸升到 ★★★ 之後可以「👑 進化」。有專屬進化圖的會換上新造型，沒有的暫時用金色光環加皇冠代替。目前只有 3 隻有進化圖，都是從怪獸塔的進化圖去背而來：火鳳雛、寶箱怪、烏雲怪。

### 進化圖的做法
- **用編輯模式**：把該怪獸的原圖當作輸入，加上第 2 節的 3 張風格參考圖，請模型把「這隻角色」進化。這樣顏色和特徵才延續得到。
- **規格**：同第 1 節（200×200 透明 PNG），存到 `public/images/monsters/evo/<id>.png`，檔名就是怪獸 id。
- **進化感**：體型大一圈、細節更多，加上一個「升級配件」（皇冠、盔甲、翅膀、光環之一）。主色不變，看得出是同一隻。

### 進化共用 prompt
```
Evolve the character in the first input image into its stronger, final evolution form.
Keep the same isometric voxel art style, same main colors and key features so it is clearly the same creature,
but make it slightly bigger, more detailed and more heroic, adding the upgrade described below.
Still cute and kid-friendly, not scary. Single character, centered, full body,
pure flat white background (#FFFFFF), no ground, no shadow, no text.
Upgrade:
```

### 進化清單（`evo/<id>.png` ← 輸入原圖：升級描述）

**夥伴**
- `penguin_knight` ← `new/penguin_knight.png`：銀藍色全身盔甲、大型圓盾和披風，頭上有小羽飾
- `moon_bunny` ← `new/moon_bunny.png`：耳朵變長，掛著新月髮飾，身邊漂浮兩顆小月亮方塊，帶淡紫光暈
- `star_bit` ← `new/star_bit.png`：方塊變成五角星形狀，四周環繞發光的小星星
- `valentine_diamond` ← `new/valentine_diamond.png`：變成多切面的大愛心寶石，有一對小天使翅膀

**晨露草原**
- `mushroom_kin` ← `new/mushroom_kin.png`：蘑菇傘變大，長出斑點和葉子披風，手拿小木杖
- `cactus_boy` ← `new/cactus_boy.png`：開出大朵仙人掌花，戴寬邊警長帽，背上有小刺盾
- `wind_slime` ← `new/wind_slime.png`：身體變成小龍捲風形狀，周圍有旋轉的葉子方塊
- `mossy_golem` ← `new/mossy_golem.png`：身上長出小樹和花，肩膀上有鳥巢

**泡泡湖**
- `ice_cube_slime` ← `new/ice_cube_slime.png`：頭上長出冰晶皇冠，身體半透明，帶雪花方塊
- `mystic_water` ← `new/mystic_water.png`：水晶身體變高，手持水晶權杖，身邊有漂浮水珠
- `sand_castle_crab` ← `new/sand_castle_crab.png`：背上的沙堡變成有旗子的雙塔城堡
- `cloud_puff` ← `new/cloud_puff.png`：雲朵變大，頂端掛一道小彩虹

**熔岩山谷**
- `magma_blob` ← `new/magma_blob.png`：外層長出黑曜石盔甲裂紋，裂縫透出橘光
- `demon_imp` ← `new/demon_imp.png`：翅膀變大，三叉戟換成有火焰的魔杖，戴小披風
- `nian_beast` ← `new/nian_beast.png`：舞獅般的金紅鬃毛，頭上掛小鞭炮和金鈴鐺（造型要原創，不要做成既有的舞獅角色）

**雷雲小鎮**
- `ufo_rider` ← `new/ufo_rider.png`：飛碟變成雙層，加上推進器，駕駛員戴頭盔（要和現有的 `evolved_ufo_rider` 長得不一樣）

**新怪獸（第 4 節的圖完成後才能做，輸入改用 `new/<id>.png`）**
- `thunder_mouse`：背上的電池變成大型發電背包，雙手握著兩顆電球，戴護目鏡（一樣避開黃色和閃電尾巴）
- `clock_owl`：肚子的鐘變成大懷錶，翅膀上的齒輪會發光，戴高帽
- `rainbow_snail`：殼變成彩虹水晶螺旋，頭上的觸角有小星星
- `balloon_pup`：身體由多顆氣球組成，背上綁著一串彩色氣球
- `temple_cat`：變成站立的貓戰士雕像，拿著金色長矛，額頭寶石更大
- `lantern_spirit`：變成三層的寶塔燈籠，四周漂浮小燈火
- `comet_fox`：九條短小的彗星尾巴，身上有星座圖案
- `space_jelly`：圓頂變成太空站，觸手末端有小推進器
- `astro_turtle`：殼變成一顆小行星，上面有小基地和旗子
- `robo_scout`：變成有噴射背包的機甲，雙肩各有一個雷達

魔王目前不需要進化圖（使用金色光環）。

進化圖放進 `evo/` 之後，在 `word_quest.html` 的 `EVO_ART` 加一行就能啟用，例如：
`penguin_knight: { name: "聖盾企鵝", img: "monsters/evo/penguin_knight.png" },`
