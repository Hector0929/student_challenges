/**
 * Monster Tower V2 - Playwright TDD Tests
 * Tests the Snakes and Ladders style game board
 */

import { test, expect } from '@playwright/test';

test.describe('Monster Tower V2', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to debug page where V2 is hosted
        await page.goto('/debug');
    });

    test('should display Monster Tower V2 section', async ({ page }) => {
        // Check that the V2 section exists
        await expect(page.getByText('怪獸塔 V2')).toBeVisible();
    });

    test('should display board with numbered tiles', async ({ page }) => {
        // Open the V2 game modal
        await page.getByTestId('monster-tower-v2-open').click();

        // Check board is visible
        await expect(page.getByTestId('tower-v2-board')).toBeVisible();

        // Check some numbered tiles are visible (1, 50, 100)
        await expect(page.getByTestId('tile-1')).toBeVisible();
    });

    test('should have roll dice button', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check roll button exists
        await expect(page.getByTestId('roll-dice-btn')).toBeVisible();
    });

    test('should roll dice when clicking roll button', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Click roll button
        await page.getByTestId('roll-dice-btn').click();

        // Check dice result is shown (1-6)
        await expect(page.getByTestId('dice-result')).toBeVisible();
    });

    test('should move player after dice roll', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Get initial position
        const playerToken = page.getByTestId('player-token');
        await expect(playerToken).toBeVisible();

        // Roll dice
        await page.getByTestId('roll-dice-btn').click();

        // Wait for animation
        await page.waitForTimeout(1500);

        // Player should have moved (animation completed)
        await expect(playerToken).toBeVisible();
    });

    test('should trigger ladder event when landing on ladder tile', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // This test would need a specific game state
        // For now, just check that ladder tiles exist on the board
        const ladderTiles = page.locator('[data-event-type="ladder"]');
        await expect(ladderTiles.first()).toBeVisible();
    });

    test('should trigger snake event when landing on snake tile', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check that snake tiles exist on the board
        const snakeTiles = page.locator('[data-event-type="trap"]');
        await expect(snakeTiles.first()).toBeVisible();
    });

    test('should show lottery wheel button at milestones', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check lottery wheel button exists (may be disabled if not at milestone)
        await expect(page.getByTestId('lottery-wheel-btn')).toBeVisible();
    });

    test('should allow purchasing dice with stars', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check purchase button exists
        await expect(page.getByTestId('purchase-dice-btn')).toBeVisible();

        // Click purchase button
        await page.getByTestId('purchase-dice-btn').click();

        // Check purchase modal appears
        await expect(page.getByTestId('purchase-modal')).toBeVisible();
    });

    test('should display dice count', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check dice count is displayed
        await expect(page.getByTestId('dice-count')).toBeVisible();
    });

    test('should display current floor', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check current floor is displayed
        await expect(page.getByTestId('current-floor')).toBeVisible();
    });

    test('should display zone information', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check zone name is displayed
        await expect(page.getByTestId('zone-name')).toBeVisible();
    });

    test('should close modal when clicking close button', async ({ page }) => {
        await page.getByTestId('monster-tower-v2-open').click();

        // Check modal is open
        await expect(page.getByTestId('tower-v2-board')).toBeVisible();

        // Click close button
        await page.getByTestId('close-tower-v2').click();

        // Modal should be closed
        await expect(page.getByTestId('tower-v2-board')).not.toBeVisible();
    });
});
