import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getTodayDate } from '../../lib/supabase';
import { TOPICS, WORDS, type Word } from './vocab';
import {
    applyAnswer,
    applySort,
    buildSession,
    isFamiliar,
    LEVELS,
    markKnown,
    NEW_WORDS_PER_DAY,
    pickDistractors,
    spellTiles,
    type Level,
    type SessionItem,
    type SortChoice,
    type WordProgress,
} from './srs';
import { feedText, taipeiDate, useFamilyWordFeed, useWordProgress, type FamilyFeedEntry } from './useWordProgress';
import { speak, stopAudioKeepAlive, unlockSpeech } from './speech';
import { SpeechCheck } from './SpeechCheck';
import './englishHarbour.css';

const shuffle = <T,>(list: T[]) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const levelOf = (map: Map<string, WordProgress>, w: Word): Level => map.get(w.word)?.level ?? 0;

type Screen =
    | { kind: 'home' }
    | { kind: 'topic'; topic: string }
    | { kind: 'sort'; topic: string; queue: Word[] }
    | { kind: 'session'; items: SessionItem[]; topic: string | null }
    | { kind: 'summary'; result: SessionResult; topic: string | null };

interface SessionResult {
    total: number;
    learned: string[];
    familiar: string[];
    upgraded: string[];
    retry: string[];
    known: string[];
}

export const EnglishHarbour: React.FC<{ userId: string }> = ({ userId }) => {
    const today = getTodayDate();
    const { map, rows, missing, isLoading, save } = useWordProgress(userId);
    const { data: feed } = useFamilyWordFeed();
    const { data: myName } = useQuery({
        queryKey: ['profile-name', userId],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('name').eq('id', userId).maybeSingle();
            return (data?.name as string | undefined) ?? '我';
        },
        enabled: !!userId,
    });
    const [screen, setScreen] = useState<Screen>({ kind: 'home' });
    const rootRef = useRef<HTMLDivElement>(null);
    // 離開書港就停掉藍牙耳機的保持喚醒
    useEffect(() => stopAudioKeepAlive, []);

    useEffect(() => {
        rootRef.current?.scrollTo({ top: 0 });
    }, [screen.kind]);

    const newLeft = Math.max(0, NEW_WORDS_PER_DAY - rows.filter((r) => !r.self_marked && r.created_at && taipeiDate(r.created_at) === today).length);

    const startSession = (topic: string | null) => {
        const items = buildSession(WORDS, map, today, { topic, newLeft });
        if (items.length) setScreen({ kind: 'session', items, topic });
    };

    const grade = useCallback(
        (word: string, firstTry: boolean) => {
            const now = new Date().toISOString();
            const prev = map.get(word);
            const next = applyAnswer(prev, word, firstTry, today, now);
            void save(next);
            return { prev, next, now };
        },
        [map, save, today],
    );

    const know = useCallback(
        (word: string) => {
            void save(markKnown(map.get(word), word, today, new Date().toISOString()));
        },
        [map, save, today],
    );

    let body: React.ReactNode;
    if (isLoading) {
        body = <p className="eh-empty">書港開門中…</p>;
    } else if (screen.kind === 'home') {
        body = <Home map={map} rows={rows} today={today} newLeft={newLeft} feed={feed ?? []} missing={missing} onStart={() => startSession(null)} onTopic={(topic) => setScreen({ kind: 'topic', topic })} />;
    } else if (screen.kind === 'topic') {
        body = (
            <TopicView
                topic={screen.topic}
                map={map}
                onBack={() => setScreen({ kind: 'home' })}
                onPractice={() => startSession(screen.topic)}
                onSort={(queue) => setScreen({ kind: 'sort', topic: screen.topic, queue })}
            />
        );
    } else if (screen.kind === 'sort') {
        body = (
            <QuickSort
                queue={screen.queue}
                onChoose={(word, choice) => {
                    const row = applySort(word, choice, today, new Date().toISOString());
                    if (row) void save(row);
                }}
                onDone={() => setScreen({ kind: 'topic', topic: screen.topic })}
            />
        );
    } else if (screen.kind === 'session') {
        body = (
            <Session
                key={screen.items.map((i) => i.word.word).join()}
                items={screen.items}
                levelOf={(w) => levelOf(map, w)}
                onGrade={grade}
                onKnown={know}
                onDone={(result) => setScreen({ kind: 'summary', result, topic: screen.topic })}
            />
        );
    } else {
        body = (
            <Summary
                result={screen.result}
                name={myName ?? '我'}
                onAgain={() => startSession(screen.topic)}
                onHome={() => setScreen({ kind: 'home' })}
            />
        );
    }

    return (
        <div className="eh-root" ref={rootRef} onPointerDownCapture={unlockSpeech}>
            <div className="eh-wrap">{body}</div>
        </div>
    );
};

/* =========================================================
   書港首頁
   ========================================================= */
interface HomeProps {
    map: Map<string, WordProgress>;
    rows: WordProgress[];
    today: string;
    newLeft: number;
    feed: FamilyFeedEntry[];
    missing: boolean;
    onStart: () => void;
    onTopic: (topic: string) => void;
}

const LevelBar: React.FC<{ words: Word[]; map: Map<string, WordProgress> }> = ({ words, map }) => {
    const counts = [0, 0, 0, 0, 0];
    for (const w of words) counts[levelOf(map, w)]++;
    return (
        <div className="eh-bar" aria-hidden>
            {[4, 3, 2, 1].map((l) => (counts[l] ? <i key={l} style={{ width: `${(counts[l] / words.length) * 100}%`, background: LEVELS[l].color }} /> : null))}
        </div>
    );
};

const Home: React.FC<HomeProps> = ({ map, rows, today, newLeft, feed, missing, onStart, onTopic }) => {
    const familiar = rows.filter((r) => r.level >= 3).length;
    const due = rows.filter((r) => r.level >= 1 && r.level <= 3 && r.due_on <= today).length;
    const practiced = rows.filter((r) => r.last_seen_at && taipeiDate(r.last_seen_at) === today).length;
    const [checking, setChecking] = useState(false);
    const plan = due || newLeft ? `今天要複習 ${due} 個字、學 ${newLeft} 個新字，大約 3 分鐘。` : '今天的份量完成了！想多練可以再來一輪。';

    return (
        <>
            <header className="eh-top">
                <p className="eh-kicker">ENGLISH HARBOUR</p>
                <h1>英文書港</h1>
                <p className="eh-sub">{plan}</p>
                <div className="eh-stats">
                    <div>
                        <b>{familiar}</b>
                        <span>已熟悉 / {WORDS.length}</span>
                    </div>
                    <div>
                        <b>{due}</b>
                        <span>今天到期</span>
                    </div>
                    <div>
                        <b>{practiced}</b>
                        <span>今天練過</span>
                    </div>
                </div>
            </header>
            {missing && <p className="eh-warn">家長請先在 Supabase 執行 add_word_progress.sql，熟悉度才會存起來。</p>}
            <button type="button" className="eh-btn eh-pri eh-start" onClick={onStart} data-testid="eh-start">
                ⚓ 開始今天的航行
            </button>
            {checking ? (
                <SpeechCheck onClose={() => setChecking(false)} />
            ) : (
                <button type="button" className="eh-check-link" onClick={() => setChecking(true)}>
                    🔈 聽不到聲音？點這裡檢查
                </button>
            )}
            {feed.length > 0 && (
                <div className="eh-feed">
                    {feed.map((e) => (
                        <div key={e.userId} className="eh-feed-item">
                            <span className="eh-av">{e.avatar}</span>
                            <span>
                                <b>{feedText(e)}</b>
                                <small>{e.words.slice(-4).join('、')}</small>
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <div className="eh-shelf-head">
                <h2>單字書架</h2>
                <div className="eh-legend">
                    {[1, 2, 3, 4].map((l) => (
                        <span key={l} style={{ '--c': LEVELS[l].color } as React.CSSProperties}>
                            {LEVELS[l].name}
                        </span>
                    ))}
                </div>
            </div>
            <div className="eh-shelf">
                {TOPICS.map((t) => {
                    const words = WORDS.filter((w) => w.topic === t.id);
                    const fam = words.filter((w) => isFamiliar(map.get(w.word))).length;
                    return (
                        <button key={t.id} type="button" className="eh-topic" onClick={() => onTopic(t.id)}>
                            <span className="eh-topic-name">
                                {t.icon} {t.name}
                            </span>
                            <LevelBar words={words} map={map} />
                            <small>
                                {fam} / {words.length} 熟悉
                            </small>
                        </button>
                    );
                })}
            </div>
        </>
    );
};

/* =========================================================
   主題書架
   ========================================================= */
const TopicView: React.FC<{
    topic: string;
    map: Map<string, WordProgress>;
    onBack: () => void;
    onPractice: () => void;
    onSort: (queue: Word[]) => void;
}> = ({ topic, map, onBack, onPractice, onSort }) => {
    const def = TOPICS.find((t) => t.id === topic)!;
    const words = WORDS.filter((w) => w.topic === topic);
    const unsorted = words.filter((w) => !map.has(w.word));
    const fam = words.filter((w) => isFamiliar(map.get(w.word))).length;
    return (
        <>
            <button type="button" className="eh-back" onClick={onBack}>
                ‹ 回書港
            </button>
            <header className="eh-top">
                <h1>
                    {def.icon} {def.name}
                </h1>
                <p className="eh-sub">
                    {fam} / {words.length} 個字熟悉了。點單字可以聽發音。
                </p>
                <LevelBar words={words} map={map} />
            </header>
            <div className="eh-row">
                <button type="button" className="eh-btn eh-pri" onClick={onPractice}>
                    練這個主題
                </button>
                {unsorted.length > 0 && (
                    <button type="button" className="eh-btn eh-gh" onClick={() => onSort(unsorted.slice(0, 20))}>
                        快速分類（{unsorted.length}）
                    </button>
                )}
            </div>
            {unsorted.length > 0 && <p className="eh-note">快速分類：一張張看，認識的字標起來就不用從頭學，大約 1 分鐘。</p>}
            <div className="eh-words">
                {words.map((w) => {
                    const l = levelOf(map, w);
                    return (
                        <button key={w.word} type="button" className="eh-word" style={{ background: LEVELS[l].color }} onClick={() => speak(w.word)} title={`${LEVELS[l].name}`}>
                            <span>
                                {w.emoji} {w.word}
                            </span>
                            <small>{w.zh}</small>
                        </button>
                    );
                })}
            </div>
        </>
    );
};

/* =========================================================
   快速分類
   ========================================================= */
const QuickSort: React.FC<{ queue: Word[]; onChoose: (word: string, choice: SortChoice) => void; onDone: () => void }> = ({ queue, onChoose, onDone }) => {
    const [i, setI] = useState(0);
    const [showZh, setShowZh] = useState(false);
    const w = queue[i];
    useEffect(() => {
        if (w) speak(w.word);
    }, [w]);
    if (!w) {
        return (
            <div className="eh-center">
                <div className="eh-big">🗂️</div>
                <h1>分類完成！</h1>
                <p className="eh-sub">認識的字會在幾天後抽查一次，確定真的會。</p>
                <button type="button" className="eh-btn eh-pri" onClick={onDone}>
                    回到書架
                </button>
            </div>
        );
    }
    const choose = (c: SortChoice) => {
        onChoose(w.word, c);
        setShowZh(false);
        setI((v) => v + 1);
    };
    return (
        <>
            <div className="eh-qhead">
                <button type="button" className="eh-x" onClick={onDone} aria-label="結束分類">
                    ✕
                </button>
                <span>
                    {i + 1} / {queue.length}
                </span>
                <span className="eh-chip">🗂️ 快速分類</span>
            </div>
            <div className="eh-card eh-sort-card">
                <div className="eh-emoji">{w.emoji || '🔤'}</div>
                <div className="eh-en">{w.word}</div>
                <button type="button" className="eh-mini" onClick={() => speak(w.word)}>
                    🔊 再聽一次
                </button>
                {showZh ? (
                    <div className="eh-zh">{w.zh}</div>
                ) : (
                    <button type="button" className="eh-mini" onClick={() => setShowZh(true)}>
                        👀 看中文
                    </button>
                )}
            </div>
            <p className="eh-ask">這個字你認識嗎？</p>
            <div className="eh-sort-btns">
                <button type="button" className="eh-btn eh-know" onClick={() => choose('know')}>
                    😎 認識
                </button>
                <button type="button" className="eh-btn eh-gh" onClick={() => choose('unsure')}>
                    🤔 不確定
                </button>
                <button type="button" className="eh-btn eh-gh" onClick={() => choose('new')}>
                    🌱 不認識
                </button>
            </div>
        </>
    );
};

/* =========================================================
   一輪練習
   ========================================================= */
interface QueueItem extends SessionItem {
    retry?: boolean;
}

const Session: React.FC<{
    items: SessionItem[];
    levelOf: (w: Word) => Level;
    onGrade: (word: string, firstTry: boolean) => { prev?: WordProgress; next: WordProgress; now: string };
    onKnown: (word: string) => void;
    onDone: (r: SessionResult) => void;
}> = ({ items, levelOf: lvl, onGrade, onKnown, onDone }) => {
    const [queue, setQueue] = useState<QueueItem[]>(items);
    const [i, setI] = useState(0);
    const [learning, setLearning] = useState(items[0]?.isNew ?? false);
    const result = useRef<SessionResult>({ total: items.length, learned: [], familiar: [], upgraded: [], retry: [], known: [] });
    const item = queue[i];

    const advance = (nextQueue: QueueItem[]) => {
        const n = i + 1;
        if (n >= nextQueue.length) {
            onDone(result.current);
            return;
        }
        setI(n);
        setLearning(!!nextQueue[n].isNew && !nextQueue[n].retry);
    };

    const handleResult = (firstTry: boolean) => {
        let nextQueue = queue;
        if (!item.retry) {
            const { prev, next, now } = onGrade(item.word.word, firstTry);
            const r = result.current;
            if (item.isNew) r.learned.push(item.word.word);
            if (next.familiar_at === now) r.familiar.push(item.word.word);
            if (next.level > (prev?.level ?? 0) && !item.isNew) r.upgraded.push(item.word.word);
            if (!firstTry) {
                r.retry.push(item.word.word);
                // 答錯的字這輪最後再練一次（不再計分）
                nextQueue = [...queue, { ...item, type: item.type === 'spellHard' ? 'spell' : item.type, retry: true }];
                setQueue(nextQueue);
            }
        }
        advance(nextQueue);
    };

    const handleKnown = () => {
        if (!item.retry) {
            onKnown(item.word.word);
            result.current.known.push(item.word.word);
        }
        advance(queue);
    };

    if (!item) return null;
    const level = lvl(item.word);
    return (
        <>
            <div className="eh-qhead">
                <button type="button" className="eh-x" onClick={() => onDone(result.current)} aria-label="結束這輪">
                    ✕
                </button>
                <span>
                    {Math.min(i + 1, queue.length)} / {queue.length}
                </span>
                <span className="eh-chip" style={{ background: LEVELS[item.retry ? 1 : level].color }}>
                    {item.retry ? '🔁 再練一次' : `${LEVELS[level].icon} ${LEVELS[level].name}`}
                </span>
            </div>
            <div className="eh-prog">
                <i style={{ width: `${(i / queue.length) * 100}%` }} />
            </div>
            {learning ? (
                <LearnCard word={item.word} onNext={() => setLearning(false)} />
            ) : item.type === 'spell' || item.type === 'spellHard' ? (
                <SpellQuestion key={`${i}-${item.word.word}`} word={item.word} hard={item.type === 'spellHard'} onResult={handleResult} />
            ) : (
                <ChoiceQuestion key={`${i}-${item.word.word}`} word={item.word} mode={item.type} onResult={handleResult} />
            )}
            {!learning && !item.retry && (
                <button type="button" className="eh-btn eh-gh eh-skip" onClick={handleKnown} data-testid="eh-known">
                    👑 這個我會了，跳過
                </button>
            )}
        </>
    );
};

const LearnCard: React.FC<{ word: Word; onNext: () => void }> = ({ word, onNext }) => {
    useEffect(() => speak(word.word), [word]);
    return (
        <>
            <p className="eh-ask">🆕 新單字</p>
            <div className="eh-card eh-learn">
                <div className="eh-emoji">{word.emoji || '🔤'}</div>
                <div className="eh-en">{word.word}</div>
                <div className="eh-zh">{word.zh}</div>
                <div className="eh-row eh-row-c">
                    <button type="button" className="eh-mini" onClick={() => speak(word.word)}>
                        🔊 聽發音
                    </button>
                    <button type="button" className="eh-mini" onClick={() => speak(word.word, 0.6)}>
                        🐢 慢慢唸
                    </button>
                </div>
            </div>
            <button type="button" className="eh-btn eh-pri eh-next" onClick={onNext} data-testid="eh-learned">
                記住了，考考我！
            </button>
        </>
    );
};

/* ---------- 選擇題：聽音選意思 / 看意思選英文 ---------- */
const ChoiceQuestion: React.FC<{ word: Word; mode: 'listen' | 'meaning'; onResult: (firstTry: boolean) => void }> = ({ word, mode, onResult }) => {
    const options = useMemo(() => shuffle([word, ...pickDistractors(word, WORDS, mode)]), [word, mode]);
    const [picked, setPicked] = useState<string | null>(null);
    const correct = picked === word.word;

    useEffect(() => {
        if (mode === 'listen') speak(word.word);
    }, [word, mode]);

    const pick = (w: Word) => {
        if (picked) return;
        setPicked(w.word);
        speak(word.word);
        if (w.word === word.word) setTimeout(() => onResult(true), 900);
    };

    return (
        <>
            {mode === 'listen' ? (
                <>
                    <button type="button" className="eh-speaker" onClick={() => speak(word.word)} aria-label="再聽一次">
                        🔊
                    </button>
                    <div className="eh-row eh-row-c">
                        <button type="button" className="eh-mini" onClick={() => speak(word.word, 0.6)}>
                            🐢 慢慢唸
                        </button>
                        <button type="button" className="eh-mini" onClick={() => speak(word.word)}>
                            🔁 再聽一次
                        </button>
                    </div>
                    <p className="eh-ask">聽到的是哪一個？</p>
                </>
            ) : (
                <>
                    <div className="eh-prompt">
                        <div className="eh-emoji">{word.emoji || '💬'}</div>
                        <div className="eh-zh">{word.zh}</div>
                    </div>
                    <p className="eh-ask">英文是哪一個？</p>
                </>
            )}
            <div className="eh-opts">
                {options.map((o) => {
                    const state = !picked ? '' : o.word === word.word ? 'is-ok' : o.word === picked ? 'is-bad' : 'is-dim';
                    return (
                        <button key={o.word} type="button" className={`eh-opt ${state}`} onClick={() => pick(o)} data-testid="eh-opt" data-answer={o.word === word.word ? '1' : undefined}>
                            {mode === 'listen' ? (
                                <>
                                    <span className="eh-opt-e">{o.emoji || '💬'}</span>
                                    <span>{o.zh}</span>
                                </>
                            ) : (
                                <span className="eh-opt-en">{o.word}</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {picked && !correct && (
                <div className="eh-fb">
                    <p>
                        答案是 <b>{word.word}</b>（{word.zh}），等一下會再練一次喔！
                    </p>
                    <button type="button" className="eh-btn eh-pri" onClick={() => onResult(false)}>
                        繼續
                    </button>
                </div>
            )}
            {picked && correct && <p className="eh-yay">答對了！🎉</p>}
        </>
    );
};

/* ---------- 拼字：只給這個字的字母 + 干擾字母 ---------- */
const SpellQuestion: React.FC<{ word: Word; hard: boolean; onResult: (firstTry: boolean) => void }> = ({ word, hard, onResult }) => {
    const target = word.word;
    const tiles = useMemo(() => spellTiles(target, hard ? 4 : 2), [target, hard]);
    const [used, setUsed] = useState<number[]>([]);
    const [filled, setFilled] = useState(0);
    const [miss, setMiss] = useState(0);
    const [hinted, setHinted] = useState(false);
    const [shake, setShake] = useState<number | null>(null);
    const done = filled >= target.length;

    useEffect(() => speak(target), [target]);

    const put = (idx: number) => {
        if (done || used.includes(idx)) return;
        if (tiles[idx] === target[filled].toLowerCase()) {
            const nf = filled + 1;
            setUsed((u) => [...u, idx]);
            setFilled(nf);
            if (nf >= target.length) {
                speak(target);
                setTimeout(() => onResult(miss === 0 && !hinted), 1000);
            }
        } else {
            setMiss((m) => m + 1);
            setShake(idx);
            setTimeout(() => setShake(null), 350);
        }
    };

    const hint = () => {
        if (done) return;
        const idx = tiles.findIndex((t, k) => t === target[filled].toLowerCase() && !used.includes(k));
        setHinted(true);
        if (idx >= 0) put(idx);
    };

    return (
        <>
            <div className="eh-prompt">
                <div className="eh-emoji">{word.emoji || '💬'}</div>
                <div className="eh-zh">{word.zh}</div>
                <button type="button" className="eh-mini" onClick={() => speak(target)}>
                    🔊 聽發音
                </button>
            </div>
            <div className="eh-slots">
                {target.split('').map((c, k) => (
                    <span key={k} className={`eh-slot ${k < filled ? 'is-f' : ''}`}>
                        {k < filled ? c : ''}
                    </span>
                ))}
            </div>
            <div className="eh-tiles">
                {tiles.map((t, k) => (
                    <button key={k} type="button" className={`eh-tile ${used.includes(k) ? 'is-used' : ''} ${shake === k ? 'is-shake' : ''}`} onClick={() => put(k)} data-testid="eh-tile">
                        {t}
                    </button>
                ))}
            </div>
            {done ? (
                <p className="eh-yay">{miss === 0 && !hinted ? '一次就拼對！🎉' : '拼好了！下次試試不用提示 💪'}</p>
            ) : (
                <div className="eh-row eh-row-c">
                    <button type="button" className="eh-mini" onClick={hint}>
                        💡 提示一個字母
                    </button>
                </div>
            )}
        </>
    );
};

/* =========================================================
   航行完成
   ========================================================= */
const Summary: React.FC<{ result: SessionResult; name: string; onAgain: () => void; onHome: () => void }> = ({ result, name, onAgain, onHome }) => {
    const r = result;
    const up = [...new Set([...r.familiar, ...r.upgraded])];
    return (
        <div className="eh-summary">
            <div className="eh-big">⚓🎉</div>
            <h1>這一輪航行完成！</h1>
            <div className="eh-sum">
                <div>
                    <span>🆕 學了新字</span>
                    <b>{r.learned.length}</b>
                </div>
                <div>
                    <span>⭐ 升到熟悉</span>
                    <b>{r.familiar.length}</b>
                </div>
                <div>
                    <span>⬆️ 升級的字</span>
                    <b>{up.length}</b>
                </div>
                <div>
                    <span>🔁 明天再練</span>
                    <b>{new Set(r.retry).size}</b>
                </div>
            </div>
            {up.length > 0 && (
                <>
                    <p className="eh-ask eh-left">這輪升級的字</p>
                    <div className="eh-chips">
                        {up.map((w) => (
                            <button key={w} type="button" className="eh-wchip" onClick={() => speak(w)}>
                                {w}
                            </button>
                        ))}
                    </div>
                </>
            )}
            {r.familiar.length > 0 && (
                <div className="eh-share">
                    <span className="eh-av">📣</span>
                    <span>
                        <b>已告訴全家：</b>「{feedText({ name, count: r.familiar.length })}」
                        <small>會出現在首頁的家人動態和群島日誌</small>
                    </span>
                </div>
            )}
            <div className="eh-row">
                <button type="button" className="eh-btn eh-gh" onClick={onHome}>
                    回到書港
                </button>
                <button type="button" className="eh-btn eh-pri" onClick={onAgain}>
                    再來一輪
                </button>
            </div>
        </div>
    );
};

export default EnglishHarbour;
