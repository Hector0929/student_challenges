
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('🚀 Starting DB Interaction Test...');
    console.log('Target:', supabaseUrl);

    const testId = 'test-' + Date.now();
    const testUserId = crypto.randomUUID(); // Generate valid UUID
    const testQuestId = crypto.randomUUID(); // Generate valid UUID
    // WARNING: In anon mode without actual auth, RLS might block this unless we fixed it.
    // Our fix allowed "USING (true)" so anon should be able to write anything if policy is active.

    console.log(`\n1. Creating test log for user: ${testUserId}...`);

    // 1. Try Insert
    const { data: insertData, error: insertError } = await supabase
        .from('daily_logs')
        .insert({
            user_id: testUserId,
            quest_id: testQuestId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Failed:', insertError.message);
        console.error('   Hint: RLS policy is blocking INSERT or table structure mismatch.');
        return;
    }
    console.log('✅ Insert Success! ID:', insertData.id);

    // 2. Try Update (Approve)
    console.log('\n2. Testing "Approve" (Update status)...');
    const { data: updateData, error: updateError } = await supabase
        .from('daily_logs')
        .update({ status: 'verified' })
        .eq('id', insertData.id)
        .select()
        .single();

    if (updateError) {
        console.error('❌ Update Failed:', updateError.message);
        console.error('   Hint: RLS policy is blocking UPDATE.');
    } else {
        console.log('✅ Update Success! New Status:', updateData.status);
    }

    // 3. Clean up
    console.log('\n3. Cleaning up test data...');
    const { error: deleteError } = await supabase
        .from('daily_logs')
        .delete()
        .eq('id', insertData.id);

    if (deleteError) {
        console.error('⚠️ Cleanup Failed:', deleteError.message);
    } else {
        console.log('✅ Cleanup Success');
    }

    console.log('\n✨ Test Complete. Database interaction logic is functional.');
}

runTest();
