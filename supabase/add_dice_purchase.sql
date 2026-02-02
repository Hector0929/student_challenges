-- Create a secure function to award dice (bypasses RLS)
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

-- Create a function to handle dice purchase transaction safely
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
  v_new_stars INTEGER;
  v_new_dice_count INTEGER;
BEGIN
  -- Validate input
  IF p_dice_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', '購買數量必須大於 0');
  END IF;

  -- Calculate cost: 5 stars for 2 dice (2.5 stars per die)
  IF p_dice_amount % 2 != 0 THEN
     v_star_cost := CEIL((p_dice_amount::FLOAT / 2.0) * 5);
  ELSE
     v_star_cost := (p_dice_amount / 2) * 5;
  END IF;

  -- Check current balance
  SELECT star_balance INTO v_current_stars
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_stars IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', '找不到使用者資料');
  END IF;

  IF v_current_stars < v_star_cost THEN
    RETURN jsonb_build_object('success', false, 'message', '星幣不足');
  END IF;

  -- 1. Deduct stars
  UPDATE profiles
  SET star_balance = star_balance - v_star_cost
  WHERE id = p_user_id
  RETURNING star_balance INTO v_new_stars;

  -- 2. Add dice
  -- Check if tower_progress exists
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
    'new_star_balance', v_new_stars,
    'new_dice_count', v_new_dice_count,
    'message', '購買成功'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
