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
  v_profile_id UUID;
BEGIN
  -- Validate input
  IF p_dice_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', '購買數量必須大於 0');
  END IF;

  -- Calculate cost: 5 stars for 2 dice (2.5 stars per die)
  -- Since we only allow buying in pairs or the math implies 2.5, let's enforce even numbers or handle .5?
  -- User said "5 yuan can buy 2 dice chances".
  -- If user buys 10 dice, cost is (10 / 2) * 5 = 25.
  -- Let's ensure dice_amount is even for simplicity, OR use float math.
  -- But stars are usually integers.
  -- Let's check if p_dice_amount is divisible by 2 to keep it simple, or round up?
  -- prompt: "5元 can buy 2... choose to buy 10". 10 is divisible by 2.
  -- Let's assume input is number of dice.
  
  IF p_dice_amount % 2 != 0 THEN
     -- If odd, maybe we charge for the half pair? e.g. 1 die = 3 stars? or block it?
     -- Let's assume the UI enforces pairs (2, 4, 6, 8, 10...)
     -- But handle odd just in case: (dice / 2.0) * 5, ceiling?
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
    INSERT INTO tower_progress (user_id, dice_count, current_floor, highest_floor)
    VALUES (p_user_id, p_dice_amount + 3, 1, 1) -- +3 default
    RETURNING dice_count INTO v_new_dice_count;
  ELSE
    UPDATE tower_progress
    SET dice_count = dice_count + p_dice_amount
    WHERE user_id = p_user_id
    RETURNING dice_count INTO v_new_dice_count;
  END IF;

  -- 3. Record transaction (Optional but good practice)
  -- We don't have a transaction table in the prompts, skipping for now to keep it simple.

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
