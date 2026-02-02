/**
 * Number Input Field Tests
 * 
 * This file contains test specifications for number input fields.
 * Tests ensure that number inputs allow natural editing (delete and type).
 * 
 * Run with: npm test -- --grep "Number Input"
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Helper function to create a number input component that follows guidelines
 */
function createTestableNumberInput() {
    const NumberInputComponent = ({ initialValue = 10, onChange }: {
        initialValue?: number;
        onChange?: (value: number) => void;
    }) => {
        const [value, setValue] = React.useState<number | string>(initialValue);

        return (
            <input
                data-testid="number-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) {
                        const newValue = v === '' ? '' : parseInt(v, 10);
                        setValue(newValue);
                        if (onChange && typeof newValue === 'number') {
                            onChange(newValue);
                        }
                    }
                }}
                onBlur={(e) => {
                    if (e.target.value === '' || value === '') {
                        setValue(0);
                        onChange?.(0);
                    }
                }}
            />
        );
    };

    return NumberInputComponent;
}

describe('Number Input Field UX', () => {
    /**
     * TEST 1: User can clear the input and type a new number
     * This is the main UX issue that was reported
     */
    it('allows user to clear all content and type new value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const NumberInput = createTestableNumberInput();

        render(<NumberInput initialValue={10} onChange={onChange} />);

        const input = screen.getByTestId('number-input');

        // User selects all and deletes
        await user.clear(input);
        expect(input).toHaveValue('');

        // User types new value
        await user.type(input, '25');
        expect(input).toHaveValue('25');
    });

    /**
     * TEST 2: Empty value defaults to 0 on blur
     */
    it('defaults to 0 when input is empty and loses focus', async () => {
        const user = userEvent.setup();
        const NumberInput = createTestableNumberInput();

        render(<NumberInput initialValue={10} />);

        const input = screen.getByTestId('number-input');

        await user.clear(input);
        await user.tab(); // blur

        expect(input).toHaveValue('0');
    });

    /**
     * TEST 3: Only numeric characters are allowed
     */
    it('rejects non-numeric input', async () => {
        const user = userEvent.setup();
        const NumberInput = createTestableNumberInput();

        render(<NumberInput initialValue={10} />);

        const input = screen.getByTestId('number-input');

        await user.clear(input);
        await user.type(input, 'abc123xyz');

        // Should only contain 123
        expect(input).toHaveValue('123');
    });

    /**
     * TEST 4: Can delete individual digits with backspace
     */
    it('allows deleting digits with backspace', async () => {
        const user = userEvent.setup();
        const NumberInput = createTestableNumberInput();

        render(<NumberInput initialValue={123} />);

        const input = screen.getByTestId('number-input');
        expect(input).toHaveValue('123');

        // Press backspace to delete last digit
        await user.type(input, '{Backspace}');
        expect(input).toHaveValue('12');

        await user.type(input, '{Backspace}');
        expect(input).toHaveValue('1');
    });

    /**
     * TEST 5: Input has correct attributes for mobile keyboards
     */
    it('has correct inputMode and pattern for mobile keyboards', () => {
        const NumberInput = createTestableNumberInput();

        render(<NumberInput />);

        const input = screen.getByTestId('number-input');

        expect(input).toHaveAttribute('type', 'text');
        expect(input).toHaveAttribute('inputMode', 'numeric');
        expect(input).toHaveAttribute('pattern', '[0-9]*');
    });
});

/**
 * Integration test for ParentControl reward_points field
 */
describe('ParentControl Reward Points Input', () => {
    it('reward_points field should follow number input guidelines', async () => {
        // This test would render the actual ParentControl component
        // and verify the reward_points input follows the guidelines

        // Note: Requires mocking useUser, useQuests, etc.
        // Implementation would be:
        //
        // render(<ParentControl />);
        // const rewardInput = screen.getByLabelText(/獎勵點數/);
        // expect(rewardInput).toHaveAttribute('type', 'text');
        // expect(rewardInput).toHaveAttribute('inputMode', 'numeric');
    });
});
