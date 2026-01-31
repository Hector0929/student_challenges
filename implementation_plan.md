# Vocabulary Games Upgrade Plan

## Overview
Replace "Echo Dungeon" with a new "Pronunciation Selection" game and upgrade "Spelling Summoner" to support category selection and a vastly expanded vocabulary (300 words).

## 📊 Shared Data Structure
Create `public/games/lib/vocab_data.js` to store the 8 themes and their words. This ensures consistency between the two games.

## 🎮 Game 1: Pronunciation Selection (發音選單字)
**File**: `public/games/pronunciation_game.html`
- **Aesthetic**: Neon Cyber / Pixel RPG.
- **Features**:
  - Theme selection screen.
  - Listen to pronunciation (Web Speech API).
  - Choose correct word from 4 options.
  - Show Chinese meaning on feedback.
  - Score tracking and progress.

## 🛡️ Game 2: Spelling Summoner (單字招喚術)
**File**: `public/games/spelling_game.html` (Existing file update)
- **Aesthetic**: Wizard/Summoning theme.
- **Features**:
  - Theme selection screen (New).
  - Expanded library (300 words).
  - Spell word by clicking letters.
  - Direct feedback on spelling errors.
  - Monster-slaying visual progression.

## 📁 File Structure
- `public/games/lib/vocab_data.js` - [NEW] Shared vocabulary database.
- `public/games/pronunciation_game.html` - [NEW] Pronunciation game.
- `public/games/spelling_game.html` - [UPDATE] Integrated with categories.
- `public/games/echo_game.html` - [DELETE] Removed as requested.

## 🛠️ Integration Steps
1. **Remove "Echo Dungeon"** from `src/components/RewardTime.tsx`.
2. **Add "Pronunciation Game"** to `GAMES` list.
3. Update `Spelling Game` description to include category selection.

## 📝 Vocabulary Categories
1. **Numbers (數字)** - 1-100, tens.
2. **People (人物)** - Pronouns, family, occupations.
3. **Body & Clothing (身體部位與服飾)**.
4. **Animals (動物)** - Common & Wildlife.
5. **Things & Environment (物品與環境)** - Stationery, furniture, weather, transport.
6. **Food & Places (食物與地方)** - Meals, drinks, rooms, locations.
7. **Time, Verbs & Adjectives (時間、動詞與形容詞)**.
8. **Prepositions & Questions (介係詞與疑問字)**.
