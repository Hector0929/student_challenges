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
    s.resume();
    s.speak(u);
};

export const speak = (text: string, rate = 0.9) => {
    const s = synth();
    if (!s || !text) return;
    if (!voices.length) loadVoices();
    // 只有解鎖用的空白句在排隊時不用 cancel，直接排在後面（保持在點擊當下發音）
    const busy = (s.speaking || s.pending) && current !== silent;
    if (busy) {
        s.cancel();
        setTimeout(() => utter(text, rate, true), 80);
    } else {
        utter(text, rate, true);
    }
};

/** 在第一次點擊時呼叫：iOS / Safari 要在使用者操作當下發過一次聲才會放行之後的發音 */
export const unlockSpeech = () => {
    const s = synth();
    if (!s || silent) return;
    loadVoices();
    silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    current = silent;
    s.speak(silent);
};

const s0 = synth();
if (s0) {
    loadVoices();
    s0.addEventListener?.('voiceschanged', loadVoices);
}
