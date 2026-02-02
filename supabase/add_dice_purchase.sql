-- Dice System Functions
-- 骰子系統 - 獎勵與購買

-- ============================================
-- 1. Award Dice Function (任務完成獎勵骰子)
-- ============================================
CREATE OR REPLACE FUNCTION award_dice(
  p_user_id UUID,
  p_dice_amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_dice_count INTEGER;
BEGIN
  -- Validate input
  IF p_dice_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', '骰子數量必須大於 0');
  END IF;

  -- Check if tower_progress exists
  IF NOT EXISTS (SELECT 1 FROM tower_progress WHERE user_id = p_user_id) THEN
    -- Create new record with default + reward
    INSERT INTO tower_progress (user_id, dice_count, current_floor, highest_floor, monsters_collected, total_climbs)
    VALUES (p_user_id, 3 + p_dice_amount, 1, 1, '{}', 0)
    RETURNING dice_count INTO v_new_dice_count;
  ELSE
    -- Update existing record
    UPDATE tower_progress
    SET dice_count = dice_count + p_dice_amount
    WHERE user_id = p_user_id
    RETURNING dice_count INTO v_new_dice_count;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_dice_count', v_new_dice_count,
    'message', '骰子已添加'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ============================================
-- 2. Purchase Dice Function (使用星幣購買骰子)
-- ============================================
-- IMPORTANT: Uses star_transactions table instead of profiles.star_balance
-- Star balance is calculated via get_child_star_balance() function
CREATE OR REPLACE FUNCTION purchase_dice(
  p_user_id UUID,
  p_dice_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_star_cost INTEGER;
  v_current_stars INTEGER;
  v_new_dice_count INTEGER;
BEGIN
  -- Validate input
  IF p_dice_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', '購買數量必須大於 0');
  END IF;

  -- Calculate cost: 5 stars for 2 dice
  IF p_dice_amount % 2 != 0 THEN
     v_star_cost := CEIL((p_dice_amount::FLOAT / 2.0) * 5);
  ELSE
     v_star_cost := (p_dice_amount / 2) * 5;
  END IF;

  -- Get current balance using the existing function
  v_current_stars := get_child_star_balance(p_user_id);

  IF v_current_stars IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', '找不到使用者資料');
  END IF;

  IF v_current_stars < v_star_cost THEN
    RETURN jsonb_build_object('success', false, 'message', '星幣不足', 'current_balance', v_current_stars, 'required', v_star_cost);
  END IF;

  -- 1. Record the spend transaction (negative amount)
  INSERT INTO star_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -v_star_cost, 'spend', '購買骰子 x' || p_dice_amount);

  -- 2. Add dice to tower_progress
  IF NOT EXISTS (SELECT 1 FROM tower_progress WHERE user_id = p_user_id) THEN
    INSERT INTO tower_progress (user_id, dice_count, current_floor, highest_floor, monsters_collected, total_climbs)
    VALUES (p_user_id, p_dice_amount + 3, 1, 1, '{}', 0)
    RETURNING dice_count INTO v_new_dice_count;
  ELSE
    UPDATE tower_progress
    SET dice_count = dice_count + p_dice_amount
    WHERE user_id = p_user_id
    RETURNING dice_count INTO v_new_dice_count;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_star_balance', v_current_stars - v_star_cost,
    'new_dice_count', v_new_dice_count,
    'spent', v_star_cost,
    'message', '購買成功'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
