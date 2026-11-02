// 英文發音（Web Speech API），處理各瀏覽器的怪癖：
// - Chrome 第一次 getVoices() 常是空的 → 監聽 voiceschanged 先載好
// - iOS / Safari 第一次發音必須在點擊當下 → 第一次點擊時先唸一個空字解鎖
// - Safari 在 cancel() 後馬上 speak() 會把新的句子吃掉 → 正在唸時稍等一下再唸
// - Chrome 的語音可能卡在暫停狀態 → speak 前先 resume()
// - 指定的聲音不能用時會整句沒聲音 → 出錯就改用系統預設英文聲音重唸

const synth = (): SpeechSynthesis | undefined => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined);

let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => {
    const s = synth();
    if (s) voices = s.getVoices();
};

// Apple 裝置內建的「特效聲音」（機器人、唱歌、氣泡聲…），語言也標成 en-US，不能拿來教發音
const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Kathy|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i;
// 聽起來自然的英文聲音，依序優先
const PREFERRED = ['Samantha', 'Ava', 'Allison', 'Nicky', 'Susan', 'Google US English', 'Karen', 'Daniel', 'Moira', 'Tessa'];

const pickVoice = () => {
    const en = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('en') && !NOVELTY.test(v.name));
    const local = en.filter((v) => v.localService);
    for (const name of PREFERRED) {
        const v = local.find((x) => x.name.includes(name)) || en.find((x) => x.name.includes(name));
        if (v) return v;
    }
    return (
        en.find((v) => v.name.includes('Google US English')) ||
        local.find((v) => v.lang.replace('_', '-') === 'en-US') ||
        en.find((v) => v.lang.replace('_', '-') === 'en-US') ||
        local[0] ||
        en[0]
    );
};

/* ---------- 聲音檢查用的紀錄（iPad 沒有開發者工具，直接顯示在畫面上） ---------- */
const logs: string[] = [];
const listeners = new Set<() => void>();
const stamp = () => new Date().toTimeString().slice(0, 8);
export const speechLog = (msg: string) => {
    logs.push(`${stamp()} ${msg}`);
    if (logs.length > 40) logs.shift();
    listeners.forEach((fn) => fn());
};
export const getSpeechLogs = () => [...logs];
export const subscribeSpeechLogs = (fn: () => void) => {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
};
const watch = (u: SpeechSynthesisUtterance, label: string) => {
    u.addEventListener('start', () => speechLog(`▶ 開始 ${label}`));
    u.addEventListener('end', () => speechLog(`■ 結束 ${label}`));
    u.addEventListener('error', (e) => speechLog(`✖ 錯誤 ${label}: ${e.error}`));
};

// 保留目前的句子，避免 Chrome 在唸完前被回收而沒聲音
let current: SpeechSynthesisUtterance | null = null;
let silent: SpeechSynthesisUtterance | null = null;

const utter = (text: string, rate: number, useVoice: boolean) => {
    const s = synth();
    if (!s) return;
    const u = new SpeechSynthesisUtterance(text);
    const voice = useVoice ? pickVoice() : undefined;
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = rate;
    u.onerror = (e) => {
        if (useVoice && voice && e.error !== 'interrupted' && e.error !== 'canceled') utter(text, rate, false);
    };
    u.onend = () => {
        if (current === u) current = null;
    };
    current = u;
    watch(u, `「${text}」${voice ? voice.name : '預設聲音'}`);
    s.resume();
    s.speak(u);
};

const waitForVoices = (then: () => void) => {
    const s = synth();
    let done = false;
    const go = () => {
        if (done) return;
        done = true;
        s?.removeEventListener?.('voiceschanged', go);
        loadVoices();
        then();
    };
    s?.addEventListener?.('voiceschanged', go);
    setTimeout(go, 1500);
};

export const speak = (text: string, rate = 0.9) => {
    const s = synth();
    if (!s || !text) {
        speechLog(s ? '沒有文字' : '這個瀏覽器不支援 speechSynthesis');
        return;
    }
    if (!voices.length) loadVoices();
    speechLog(`speak「${text}」 speaking=${s.speaking} pending=${s.pending} paused=${s.paused} voices=${voices.length}`);
    // 只有解鎖用的空白句在排隊時不用 cancel，直接排在後面（保持在點擊當下發音）
    const busy = (s.speaking || s.pending) && current !== silent;
    if (busy) s.cancel();
    if (!voices.length) {
        // Chrome 的聲音清單是第一次用到才載入；清單還沒好就唸，會用到沙啞的預設聲音（Albert 之類）
        waitForVoices(() => utter(text, rate, true));
    } else if (busy) {
        setTimeout(() => utter(text, rate, true), 80);
    } else {
        utter(text, rate, true);
    }
};

/** 在第一次點擊時呼叫：iOS / Safari 要在使用者操作當下發過一次聲才會放行之後的發音 */
export const unlockSpeech = () => {
    startAudioKeepAlive();
    const s = synth();
    if (!s || silent) return;
    loadVoices();
    silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    current = silent;
    watch(silent, '解鎖空白句');
    s.speak(silent);
};

/* ---------- 藍牙耳機保持喚醒 ----------
   藍牙耳機沒聲音一陣子會休眠，重新連上要 0.5～1 秒；單字只唸 0.5 秒，
   常常耳機醒來時已經唸完了，聽起來就是「完全沒聲音」。
   書港開著時持續送出聽不到的極小聲音，讓耳機一直保持連線。 */
let keepAlive: { ctx: AudioContext; osc: OscillatorNode } | null = null;

export const startAudioKeepAlive = () => {
    if (keepAlive || typeof window === 'undefined') return;
    try {
        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 30;
        gain.gain.value = 0.0005;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        void ctx.resume();
        keepAlive = { ctx, osc };
        speechLog(`保持喚醒 audio state=${ctx.state}`);
    } catch (e) {
        speechLog(`保持喚醒失敗: ${String(e)}`);
    }
};

export const stopAudioKeepAlive = () => {
    if (!keepAlive) return;
    keepAlive.osc.stop();
    keepAlive.ctx.close().catch(() => undefined);
    keepAlive = null;
};

export interface SpeechDebugInfo {
    supported: boolean;
    voiceCount: number;
    englishVoices: string[];
    chosen: string;
    userAgent: string;
}

export const getSpeechDebugInfo = (): SpeechDebugInfo => {
    loadVoices();
    const v = pickVoice();
    return {
        supported: !!synth(),
        voiceCount: voices.length,
        englishVoices: voices
            .filter((x) => x.lang.replace('_', '-').toLowerCase().startsWith('en'))
            .map((x) => `${x.name} (${x.lang}${x.localService ? '' : ', 雲端'}${NOVELTY.test(x.name) ? ', 特效' : ''})`),
        chosen: v ? `${v.name} (${v.lang})` : '（沒有，交給系統預設）',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
};

/** 最陽春的發音：不指定聲音、不 cancel，用來判斷是不是挑聲音的問題 */
export const speakPlain = (text: string) => {
    const s = synth();
    if (!s) return speechLog('這個瀏覽器不支援 speechSynthesis');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    current = u;
    watch(u, `「${text}」陽春版`);
    s.speak(u);
};

/** 嗶一聲：判斷裝置本身有沒有聲音（iPad 靜音鍵會讓網頁音效沒聲音） */
export const beep = () => {
    try {
        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.15;
        osc.frequency.value = 660;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        speechLog(`嗶一聲 audio state=${ctx.state}`);
        setTimeout(() => ctx.close().catch(() => undefined), 600);
    } catch (e) {
        speechLog(`嗶聲失敗: ${String(e)}`);
    }
};

const s0 = synth();
if (s0) {
    loadVoices();
    s0.addEventListener?.('voiceschanged', () => {
        loadVoices();
        speechLog(`聲音清單載入 ${voices.length} 個`);
    });
}
