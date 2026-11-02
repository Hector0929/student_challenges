import React, { useEffect, useState } from 'react';
import { beep, getSpeechDebugInfo, getSpeechLogs, speak, speakPlain, subscribeSpeechLogs, type SpeechDebugInfo } from './speech';

/** 聲音檢查：把瀏覽器的發音狀態顯示出來，iPad 上截圖就能看出卡在哪 */
export const SpeechCheck: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [info, setInfo] = useState<SpeechDebugInfo>(() => getSpeechDebugInfo());
    const [logs, setLogs] = useState(getSpeechLogs);
    useEffect(() => subscribeSpeechLogs(() => setLogs(getSpeechLogs())), []);
    const refresh = () => setInfo(getSpeechDebugInfo());

    return (
        <div className="eh-check" data-testid="eh-speech-check">
            <div className="eh-check-head">
                <b>🔧 聲音檢查</b>
                <button type="button" className="eh-mini" onClick={onClose}>
                    關閉
                </button>
            </div>
            <p className="eh-check-tip">依序按下面的按鈕，聽聽看哪一個有聲音，然後把這個畫面截圖。</p>
            <div className="eh-check-btns">
                <button type="button" className="eh-mini" onClick={beep}>
                    1. 嗶一聲
                </button>
                <button type="button" className="eh-mini" onClick={() => speakPlain('hello')}>
                    2. 陽春發音
                </button>
                <button
                    type="button"
                    className="eh-mini"
                    onClick={() => {
                        speak('apple');
                        refresh();
                    }}
                >
                    3. 書港發音
                </button>
            </div>
            <dl className="eh-check-info">
                <dt>支援語音</dt>
                <dd>{info.supported ? '是' : '否'}</dd>
                <dt>聲音數量</dt>
                <dd>{info.voiceCount}</dd>
                <dt>書港選用</dt>
                <dd>{info.chosen}</dd>
                <dt>英文聲音</dt>
                <dd>{info.englishVoices.length ? info.englishVoices.slice(0, 12).join('、') : '（沒有）'}</dd>
                <dt>瀏覽器</dt>
                <dd>{info.userAgent}</dd>
            </dl>
            <pre className="eh-check-log">{logs.length ? logs.join('\n') : '（還沒有紀錄）'}</pre>
        </div>
    );
};
