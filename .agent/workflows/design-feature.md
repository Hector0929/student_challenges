---
description: 自動化設計流程：產生 Design System、查詢 UX 規範並建立實作計畫
---

1. 詢問用戶要設計的功能名稱或關鍵字（如果未提供）。
2. 執行 Design System 搜尋：
   ```bash
   python3 .agent/skills/ui-ux-pro-max/scripts/search.py "<KEYWORD>" --design-system
   ```
3. 查詢該功能的 UX 最佳實踐：
   ```bash
   python3 .agent/skills/ui-ux-pro-max/scripts/search.py "<KEYWORD> accessibility best practices" --domain ux
   ```
4. 查詢適合的元件實作方式 (React + Tailwind)：
   ```bash
   python3 .agent/skills/ui-ux-pro-max/scripts/search.py "<KEYWORD> component" --stack react
   ```
5. 綜合以上資訊，建立一份 `implementation_plan.md`，包含設計規範與實作步驟。
