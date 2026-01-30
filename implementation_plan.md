# Implementation Plan: Dashboard Widgets

## Feature Overview
Add two informational widgets to the Child Dashboard:
1.  **Parent's Note (父母的叮嚀)**: A motivational message area.
2.  **Exchange Rate (匯率)**: Displaying the conversion rate between Stars and Real Currency (e.g., TWD).

## UX/UI Design
-   **Style**: Pixel RPG / Cyberpunk consistent with existing theme.
-   **Layout**: Top of the dashboard, above the "Daily Quests", probably in a 2-column grid or a flex banner.
-   **Components**:
    -   `MessageBoard`: A container looking like a wooden sign or holographic terminal.
    -   `RateDisplay`: A sleek pill or card showing `[Star] 1 = [Coin] 10 TWD`.

## Technical Implementation
-   **File**: `src/components/ChildDashboardWidgets.tsx` (New)
-   **Integration**: Import into `src/pages/ChildDashboard.tsx`.
-   **Data Strategy**:
    -   **Message**: Static default for now ("完成今天的任務，就離夢想更近一步喔！"). *Future: Add `motd` to `families` table.*
    -   **Rate**: Static constant (`1 Star = 10 元` is a safe default).

## Steps
1.  Create `src/components/ChildDashboardWidgets.tsx`.
2.  Implement `ParentsMessageCard`.
3.  Implement `ExchangeRateCard`.
4.  Update `ChildDashboard.tsx` to include these widgets.
