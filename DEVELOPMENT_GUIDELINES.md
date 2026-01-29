# Daily QuestMon 開發指導原則 (Development Guidelines)

本文件旨在規範專案開發流程，特別是關於「家庭資料隔離」與「資料寫入」的核心邏輯，以避免未來的開發者重蹈覆徹。

## 1. 核心架構：家庭資料隔離 (Family Data Isolation)

本專案是一個多租戶系統 (Multi-tenant System)，不同的家庭 (Family) 只能看到屬於自己的資料。

### 原則
所有與使用者相關的查詢 (Query)，**必須** 嚴格限制在當前使用者的 `family_id` 範圍內。

### 實作機制 (`useQuests` 範例)
由於 `quests` 表格本身**沒有** `family_id` 欄位，我們依賴 `created_by` (建立者) 與 `profiles` 的關聯來進行篩選。

**正確的查詢模式：**
```typescript
// ❌ 錯誤：只抓取所有任務 (會造成資料外洩)
supabase.from('quests').select('*');

// ✅ 正確：透過 profiles 進行 Inner Join 篩選
supabase
    .from('quests')
    .select('*, profiles!inner(family_id)')
    .eq('profiles.family_id', currentUser.family_id);
```

---

## 2. 資料寫入規範 (Data Mutation Rules)

為了配合上述的「隔離讀取」機制，寫入資料時必須確保關聯欄位完整。

### 關鍵規則：`created_by` 是必填項
任何新增物件 (Quest, Reward, Log)，如果它屬於某個家庭，**必須** 明確填入 `created_by` 欄位，值為當前操作者的 User ID。

**為什麼？**
如果 `created_by` 為空 (NULL)：
1. 此物件在資料庫中成為「孤兒」。
2. `profiles!inner(family_id)` 關聯查詢會失敗 (因為找不到 Profile)。
3. **後果**：使用者新增成功，但列表馬上看不到該物件 (Silent Failure)。

**正確的寫入模式 (`useCreateQuest` 範例)：**
```typescript
// ❌ 錯誤：未傳入建立者
createQuestMutation.mutateAsync({
    title: '刷牙',
    status: 'active'
});

// ✅ 正確：明確傳入 user.id
const { user } = useUser(); // 確保在 Component 頂層取得 user

createQuestMutation.mutateAsync({
    title: '刷牙',
    status: 'active',
    created_by: user.id // <--- 關鍵！
});
```

---

## 3. React Hooks 使用規範

在修正 Bug 的過程中，發現有 Hook 使用不當的情況。

### 規則
1. **不要在 Event Handler 中呼叫 Hook**：`useUser()` 等 Hooks 必須在 Component 的頂層 (Top Level) 宣告。
2. **提前解構**：在 Component 開頭就將需要的資料準備好。

**範例：**
```tsx
// ❌ 錯誤
const handleSubmit = () => {
    const user = useUser().user; // 💥 React Error: Hook called inside callback
    submit(user.id);
}

// ✅ 正確
export const MyComponent = () => {
    const { user } = useUser(); // Top level

    const handleSubmit = () => {
        submit(user?.id); // Safe to use
    }
}
```

---

## 4. 權限與 RLS 特殊案例 (RLS & Permissions)

在部分情況下（如：孩子建立願望任務），我們需要特別注意 Supabase RLS (Row Level Security) 與 App 邏輯的差異。

### 問題情境
當使用「切換 Profile」功能登入孩子帳號時，底層的 Supabase Auth User 仍然是 **家長 (Parent)**。
如果 RLS 設定為 `check (auth.uid() = created_by)`，但前端傳入的是 `created_by: childProfileId`，寫入就會失敗。

### 解決方案
在這種情況下，應使用 `session.user.id` (Auth ID) 作為 `created_by`，並在其他欄位 (如 `description`) 註記實際請求者。

**範例 (ChildDashboard.tsx):**
```typescript
const { user, session } = useUser();

// 即使是孩子操作，created_by 仍需填入 Auth User ID (Parent) 以通過 RLS
const creatorId = session?.user?.id || user.id;

createQuestMutation.mutateAsync({
    // ...
    title: formData.title,
    created_by: creatorId,
    description: `由 ${user.name} 建立的願望任務` // 在內容中註記實際來源
});
```

---

## 5. 測試檢查清單 (Validations)

在提交程式碼前，請自我檢查：
- [ ] **新增功能**：新增的資料是否包含 `created_by` 或 `user_id`？
- [ ] **讀取功能**：查詢是否包含 `family_id` 的過濾條件？
- [ ] **權限測試**：
    1. 登入家庭 A，新增一個項目。
    2. 登入家庭 B，確認**看不到**該項目。
    3. 切回家庭 A，確認**看得到**該項目。
