---
description: 使用 Nano Banana Pro (Gemini 3) 生成圖片
---

1. 詢問用戶想要的圖片描述 (Prompt)。
2. 詢問是否需要指定解析度 (1K, 2K, 4K，預設 1K)。
3. 使用當前時間產生檔案名稱，例如 `image-{timestamp}.png`。
4. 執行生成指令：
   ```powershell
   # 確保使用專案根目錄下的相對路徑
   uv run .agent/skills/nano-banana-pro/scripts/generate_image.py --prompt "<PROMPT>" --filename "<FILENAME>" --resolution "<RESOLUTION>"
   ```
   *(如果用戶沒有 `uv`，嘗試使用 `python .agent/skills/nano-banana-pro/scripts/generate_image.py ...`，但可能需要手動安裝依賴)*
5. 告知用戶生成結果路徑。
