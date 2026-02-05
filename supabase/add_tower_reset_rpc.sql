-- Add reset_tower_progress RPC function
-- This bypasses RLS to allow proper tower reset from frontend

-- Create the reset function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION reset_tower_progress(p_user_id UUID)
RETURNS tower_progress AS $$
DECLARE
    result tower_progress;
BEGIN
    -- Update the tower progress
    UPDATE tower_progress
    SET 
        current_floor = 1,
        dice_count = 5,
        total_climbs = total_climbs + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO result;
    
    -- If no row found, create one
    IF result IS NULL THEN
        INSERT INTO tower_progress (user_id, current_floor, dice_count, total_climbs)
        VALUES (p_user_id, 1, 5, 1)
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_tower_progress(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION reset_tower_progress IS '重置怪獸塔進度 - 回到第1層並獲得5顆骰子';
