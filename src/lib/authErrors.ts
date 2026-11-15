/** 把 Supabase Auth 的英文錯誤轉成中文，並附上下一步 */
export function authErrorMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? '');
    const msg = raw.toLowerCase();

    if (msg.includes('invalid login credentials')) return '帳號或密碼不正確。再試一次，或按「忘記密碼」。';
    if (msg.includes('email not confirmed')) return '這個 Email 還沒完成驗證，請先到信箱點驗證連結。';
    if (msg.includes('already registered') || msg.includes('already been registered')) return '這個 Email 已經註冊過了，請直接登入。';
    if (msg.includes('password should be at least') || msg.includes('password is too short')) return '密碼至少要 6 個字元。';
    if (msg.includes('same as the old password') || msg.includes('should be different')) return '新密碼不能和舊密碼一樣。';
    if (msg.includes('unable to validate email') || msg.includes('invalid email')) return 'Email 格式不正確，請再檢查一次。';
    if (msg.includes('rate limit') || msg.includes('for security purposes') || msg.includes('too many')) return '嘗試太多次了，請稍等一分鐘再試。';
    if (msg.includes('failed to fetch') || msg.includes('network')) return '連不上伺服器，請檢查網路後再試一次。';
    if (msg.includes('expired') || msg.includes('invalid token') || msg.includes('otp')) return '連結已經過期，請重新申請一次。';

    // 已經是中文的訊息（例如我們自己丟的錯誤）直接顯示
    if (/[一-鿿]/.test(raw)) return raw;
    return '發生錯誤，請稍後再試。';
}
