import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cardMatches,
  deterministicShuffle,
  loadDeck,
  loadManifest,
  stableDirection,
} from './lib/deck.js';
import { extractStrokeGeometry, fetchStrokeSvg, kanjiVGSources } from './lib/strokes.js';

const FORMATION_LABELS = {
  pictographic: 'Tượng hình',
  simple_ideograph: 'Chỉ sự',
  ideographic: 'Hội ý',
  compound_ideograph: 'Hội ý',
  phono_semantic: 'Hình thanh',
  kokuji: 'Quốc tự',
  component: 'Thành phần',
  unknown: 'Chưa xác định',
};

const STORAGE_KEY = 'ht-kanji-ui-v1';

function restorePreferences() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePreferences(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable in private contexts; the app still works.
  }
}

function App() {
  const restored = useMemo(restorePreferences, []);
  const [manifest, setManifest] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deckId, setDeckId] = useState(restored.deckId || 'sc1');
  const [page, setPage] = useState(restored.page || 'all');
  const [frontMode, setFrontMode] = useState(restored.frontMode || 'kanji');
  const [order, setOrder] = useState(restored.order || 'sequential');
  const [search, setSearch] = useState('');
  const [shuffleSeed, setShuffleSeed] = useState(Date.now());
  const [cursor, setCursor] = useState(0);
  const [side, setSide] = useState('front');
  const [selectedComponent, setSelectedComponent] = useState(null);

  useEffect(() => {
    let active = true;
    loadManifest()
      .then((value) => {
        if (!active) return;
        setManifest(value);
        if (!value.decks.some((deck) => deck.id === deckId)) setDeckId(value.decks[0]?.id || 'sc1');
      })
      .catch((cause) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const deckMeta = manifest?.decks.find((deck) => deck.id === deckId) || manifest?.decks[0];

  useEffect(() => {
    if (!deckMeta) return;
    let active = true;
    setLoading(true);
    setError('');
    loadDeck(deckMeta.files || deckMeta.file)
      .then((value) => {
        if (!active) return;
        setCards(value);
        setCursor(0);
        setSide('front');
      })
      .catch((cause) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [deckMeta?.id]);

  useEffect(() => {
    if (!deckMeta) return;
    if (page !== 'all' && !deckMeta.pages.some((entry) => String(entry.page) === String(page))) {
      setPage('all');
    }
  }, [deckMeta, page]);

  useEffect(() => {
    savePreferences({ deckId, page, frontMode, order });
  }, [deckId, page, frontMode, order]);

  const queue = useMemo(() => {
    let list = cards.filter((card) => (page === 'all' || card.page === Number(page)) && cardMatches(card, search));
    if (order === 'shuffle') list = deterministicShuffle(list, shuffleSeed);
    return list;
  }, [cards, page, search, order, shuffleSeed]);

  useEffect(() => {
    setCursor(0);
    setSide('front');
  }, [deckId, page, search, order, shuffleSeed]);

  const current = queue.length ? queue[Math.min(cursor, queue.length - 1)] : null;
  const currentPosition = current ? cursor + 1 : 0;
  const effectiveFront = frontMode === 'random' ? stableDirection(current?.id) : frontMode;

  const move = (delta) => {
    if (!queue.length) return;
    setCursor((value) => (value + delta + queue.length) % queue.length);
    setSide('front');
  };

  const randomCard = () => {
    if (queue.length <= 1) return;
    let next = cursor;
    while (next === cursor) next = Math.floor(Math.random() * queue.length);
    setCursor(next);
    setSide('front');
  };

  const toggleSide = () => setSide((value) => value === 'front' ? 'back' : 'front');

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        toggleSide();
      } else if (event.key === 'ArrowLeft') {
        move(-1);
      } else if (event.key === 'ArrowRight') {
        move(1);
      } else if (event.key.toLowerCase() === 'r') {
        randomCard();
      } else if (event.key.toLowerCase() === 's') {
        setOrder((value) => value === 'shuffle' ? 'sequential' : 'shuffle');
        setShuffleSeed(Date.now());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [queue, cursor]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Kanji">
          <span className="brand-mark" aria-hidden="true">漢</span>
          <strong>Kanji</strong>
        </div>

        <div className="topbar-progress" aria-live="polite">
          <span>{deckMeta?.label || '—'}</span>
          <strong>{currentPosition} / {queue.length}</strong>
        </div>
      </header>

      <main className="workspace">
        <section className="filters" aria-label="Tùy chọn học">
          <Field label="Khóa" htmlFor="deck-select">
            <select
              id="deck-select"
              value={deckId}
              onChange={(event) => { setDeckId(event.target.value); setPage('all'); }}
            >
              {(manifest?.decks || []).map((deck) => (
                <option key={deck.id} value={deck.id}>{deck.label} · {deck.count} chữ</option>
              ))}
            </select>
          </Field>

          <Field label="Trang" htmlFor="page-select">
            <select id="page-select" value={page} onChange={(event) => setPage(event.target.value)}>
              <option value="all">Tất cả · {deckMeta?.count || 0} chữ</option>
              {(deckMeta?.pages || []).map((entry) => (
                <option key={entry.page} value={entry.page}>Trang {entry.page} · {entry.count} chữ</option>
              ))}
            </select>
          </Field>

          <Field label="Mặt trước" htmlFor="front-select">
            <select id="front-select" value={frontMode} onChange={(event) => { setFrontMode(event.target.value); setSide('front'); }}>
              <option value="kanji">Kanji</option>
              <option value="hanviet">Hán Việt + nghĩa</option>
              <option value="random">Ngẫu nhiên hai chiều</option>
            </select>
          </Field>

          <Field label="Thứ tự" htmlFor="order-select">
            <select
              id="order-select"
              value={order}
              onChange={(event) => {
                setOrder(event.target.value);
                if (event.target.value === 'shuffle') setShuffleSeed(Date.now());
              }}
            >
              <option value="sequential">Theo tài liệu</option>
              <option value="shuffle">Xáo trộn</option>
            </select>
          </Field>

          <Field label="Tìm" htmlFor="search-input" className="search-field">
            <div className="search-box">
              <input
                id="search-input"
                type="search"
                placeholder="Kanji, Hán Việt, nghĩa, âm On/Kun…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && <button type="button" className="clear-search" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">×</button>}
            </div>
          </Field>

          <button type="button" className="quiet-action random-action" onClick={randomCard} disabled={queue.length < 2}>Ngẫu nhiên</button>
        </section>

        {loading ? (
          <StatusPanel>Đang tải dữ liệu…</StatusPanel>
        ) : error ? (
          <StatusPanel tone="error">{error}</StatusPanel>
        ) : !current ? (
          <StatusPanel>Không có chữ phù hợp với bộ lọc hiện tại.</StatusPanel>
        ) : (
          <>
            <section className="study-stage" aria-live="polite">
              <article className={`study-card study-card--${side}`}>
                {side === 'front' ? (
                  <CardFront card={current} mode={effectiveFront} onFlip={toggleSide} deckLabel={deckMeta?.label} />
                ) : (
                  <CardBack card={current} onOpenComponent={setSelectedComponent} />
                )}
              </article>
            </section>

            <nav className="card-controls" aria-label="Điều khiển flashcard">
              <button type="button" className="nav-button" onClick={() => move(-1)} aria-label="Thẻ trước">←</button>
              <button type="button" className="flip-button" onClick={toggleSide}>{side === 'front' ? 'Lật thẻ' : 'Mặt trước'}</button>
              <button type="button" className="nav-button" onClick={() => move(1)} aria-label="Thẻ tiếp">→</button>
            </nav>

            <div className="queue-line" aria-hidden="true">
              <span style={{ '--queue-progress': `${(currentPosition / Math.max(queue.length, 1)) * 100}%` }} />
            </div>

            <p className="key-help">Space: lật · ←/→: chuyển · R: ngẫu nhiên · S: xáo trộn</p>
          </>
        )}
      </main>

      <RecursiveDialog component={selectedComponent} onClose={() => setSelectedComponent(null)} />
    </div>
  );
}

function Field({ label, htmlFor, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function StatusPanel({ children, tone = 'normal' }) {
  return <div className={`status-panel status-panel--${tone}`}>{children}</div>;
}

function CardFront({ card, mode, onFlip, deckLabel }) {
  const isKanji = mode === 'kanji';
  return (
    <button type="button" className="front-face" onClick={onFlip} aria-label="Lật thẻ để xem đáp án">
      <span className="front-meta">{deckLabel} · Trang {card.page} · #{card.index}</span>
      <div className="front-center">
        <span className="front-label">{isKanji ? 'KANJI' : 'HÁN VIỆT'}</span>
        <strong className={isKanji ? 'front-kanji cjk' : 'front-reading'}>{isKanji ? card.kanji : card.hanViet}</strong>
        {!isKanji && <span className="front-meaning">{card.meaning}</span>}
      </div>
      <span className="front-hint">Nhấp hoặc nhấn Space để lật</span>
    </button>
  );
}

function CardBack({ card, onOpenComponent }) {
  const hasReadings = Boolean(card.on || card.kun || card.kunWords || card.furigana);
  return (
    <div className="back-face">
      <header className="answer-head">
        <div className="answer-glyph cjk">{card.kanji}</div>
        <div className="answer-title">
          <div className="answer-kicker">{FORMATION_LABELS[card.formationType] || 'Kanji'}</div>
          <h1>{card.hanViet || '—'}</h1>
          <p>{card.meaning || 'Chưa có nghĩa.'}</p>
        </div>
      </header>

      {hasReadings && (
        <section className="reading-strip" aria-label="Cách đọc">
          <Fact label="Âm On" value={card.on} />
          <Fact label="Âm Kun" value={card.kun} />
          <Fact label="Từ Kun" value={card.kunWords} />
          <FuriganaFact value={card.furigana} />
        </section>
      )}

      {card.components?.length > 0 && (
        <section className="learning-section components-section">
          <SectionHead title="Thành phần" meta={`${card.components.length} phần`} />
          <div className={`component-grid ${card.components.length === 1 ? 'component-grid--single' : ''}`}>
            {card.components.map((component, index) => (
              <ComponentCard key={`${card.id}-${component.component}-${index}`} component={component} onOpen={onOpenComponent} />
            ))}
          </div>
        </section>
      )}

      <section className="root-learning-grid">
        <div className="meaning-panel">
          <span className="panel-label">Nghĩa</span>
          <p>{card.meaning || '—'}</p>
        </div>
        <div className="mnemonic-panel">
          <span className="panel-label">Mẹo nhớ</span>
          <p>{card.mnemonic || '—'}</p>
        </div>
      </section>

      {(card.etymology || card.formation) && (
        <FormationPanel card={card} />
      )}

      <section className="learning-section stroke-section">
        <SectionHead title="Thứ tự nét" />
        <StrokeOrder key={card.id} kanji={card.kanji} />
      </section>
    </div>
  );
}


const CLAIM_TYPE_LABELS = {
  pictographic: 'Tượng hình',
  indicative: 'Chỉ sự',
  ideographic: 'Hội ý',
  'compound-ideograph': 'Hội ý',
  compound_ideograph: 'Hội ý',
  'phono-semantic': 'Hình thanh',
  phono_semantic: 'Hình thanh',
  kokuji: 'Quốc tự',
  component: 'Thành phần',
  unknown: 'Chưa xác định',
};

const QUALITY_LABELS = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const SCOPE_LABELS = {
  current: 'dạng hiện tại',
  origin: 'dạng gốc',
};

function formationLabel(value) {
  return CLAIM_TYPE_LABELS[value] || FORMATION_LABELS[value] || value || 'Chưa xác định';
}

function sourceLabel(value) {
  const labels = {
    'ids-analysis': 'CJKVI IDS Analysis',
    ids_analysis: 'CJKVI IDS Analysis',
    'hanzi-etymology-dict.aggregate': 'Hanzi Etymology Dict',
    wiktionary: 'Wiktionary',
    dong_chinese: 'Dong Chinese',
  };
  return labels[value] || value || 'Nguồn khác';
}

function getFormationEvolutionPath(card, formation) {
  if (!formation) return '';

  const rawPath = String(formation.originPath || '').trim();
  const current = String(card?.kanji || '').trim();
  const origin = String(formation.originChar || '').trim();

  if (rawPath) {
    const parts = rawPath
      .split(/\s*→\s*/u)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      const first = parts[0];
      const last = parts[parts.length - 1];

      // Database provenance stores current → older/origin.
      // Learner-facing evolution should read historical origin → current.
      if ((current && first === current) || (origin && last === origin && first !== origin)) {
        return [...parts].reverse().join(' → ');
      }

      if (origin && current && first === origin && last === current) {
        return parts.join(' → ');
      }

      return parts.join(' → ');
    }
  }

  if (origin && current && origin !== current) {
    return `${origin} → ${current}`;
  }

  return '';
}

function FormationPanel({ card }) {
  const formation = card.formation;
  const claims = formation?.claims || [];
  const hasOriginDifference = Boolean(
    formation?.historicalFormDiffers ||
    (formation?.originChar && formation.originChar !== card.kanji) ||
    (formation?.originIds && formation?.currentVisualIds && formation.originIds !== formation.currentVisualIds)
  );
  const evolutionPath = hasOriginDifference ? getFormationEvolutionPath(card, formation) : '';

  return (
    <details className="learning-section formation-section">
      <summary className="formation-toggle">
        <span className="formation-toggle-title">Nguồn gốc cấu tạo</span>
        <span className="formation-toggle-side">
          {formation?.conflict && <span className="formation-toggle-meta">Có bất đồng giữa nguồn</span>}
          <span className="formation-toggle-icon" aria-hidden="true">⌄</span>
        </span>
      </summary>

      <div className="formation-body">
        {card.etymology && (
          <div className="formation-summary">
            <p>{card.etymology}</p>
          </div>
        )}

        {formation && (
          <>
            <div className="formation-facts">
              <FormationFact label="Phân loại" value={formationLabel(formation.selectedType || card.formationType)} />
              {formation.quality && <FormationFact label="Độ chắc chắn" value={QUALITY_LABELS[formation.quality] || formation.quality} />}
              {formation.originChar && <FormationFact label="Dạng gốc" value={formation.originChar} cjk />}
              {formation.originIds && <FormationIdsFact label="IDS dạng gốc" value={formation.originIds} />}
              {formation.currentVisualIds && <FormationIdsFact label="IDS hiện tại" value={formation.currentVisualIds} />}
              {evolutionPath && <FormationFact label="Biến đổi dạng" value={evolutionPath} cjk />}
            </div>

            {formation.conflict && (
              <div className="formation-conflict">
                <strong>Bất đồng giữa nguồn</strong>
                <p>
                  Các nguồn không hoàn toàn thống nhất về loại cấu tạo. Bên dưới hiển thị đầy đủ từng phân tích thay vì tự động gộp hoặc bỏ một nguồn.
                </p>
              </div>
            )}

            {claims.length > 0 && (
              <div className="formation-claims">
                <div className="formation-claims-head">
                  <h3>Phân tích theo từng nguồn</h3>
                  <span>{claims.length} nguồn/claim</span>
                </div>
                <div className="formation-claim-list">
                  {claims.map((claim, index) => (
                    <article className="formation-claim" key={`${claim.source}-${claim.scope}-${claim.type}-${index}`}>
                      <div className="formation-claim-head">
                        <strong>{formationLabel(claim.type)}</strong>
                        <span>{SCOPE_LABELS[claim.scope] || claim.scope || 'không ghi scope'}</span>
                      </div>
                      <div className="formation-source-line">
                        {claim.sourceUrl ? (
                          <a href={claim.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel(claim.source)}</a>
                        ) : (
                          <span>{sourceLabel(claim.source)}</span>
                        )}
                        {claim.weight != null && <small>trọng số {claim.weight}</small>}
                      </div>
                      {claim.detail && <p className="formation-claim-detail">{claim.detail}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="formation-provenance">
              <span>Nguồn cấu trúc</span>
              <div>
                {formation.sourceIdsAnalysis && (
                  <a href={formation.sourceIdsAnalysis} target="_blank" rel="noreferrer">IDS Analysis</a>
                )}
                {formation.sourceEtymologyCrosscheck && (
                  <a href={formation.sourceEtymologyCrosscheck} target="_blank" rel="noreferrer">Etymology cross-check</a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </details>
  );
}

function FormationFact({ label, value, cjk = false }) {
  if (!value) return null;
  return (
    <div className="formation-fact">
      <span>{label}</span>
      <strong className={cjk ? 'cjk' : ''}>{value}</strong>
    </div>
  );
}

function FormationIdsFact({ label, value }) {
  if (!value) return null;
  return (
    <div className="formation-fact formation-fact--ids">
      <span>{label}</span>
      <div className="formation-ids-value">
        <IdsGlyph expression={value} />
        <code>{value}</code>
      </div>
    </div>
  );
}

function SectionHead({ title, meta }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function FuriganaFact({ value }) {
  if (!value) return null;
  const entries = String(value)
    .split(/\s*[;；]\s*/u)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return (
    <div className="fact fact--furigana">
      <span>Furigana</span>
      <div className="furigana-list">
        {entries.map((entry, index) => (
          <FuriganaRuby key={`${entry}-${index}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function FuriganaRuby({ entry }) {
  const match = String(entry).match(/^(.*?)【([^】]+)】$/u);
  if (!match) return <span className="furigana-plain cjk">{entry}</span>;

  const [, surface, reading] = match;
  const surfaceChars = Array.from(surface);
  const readingChars = Array.from(reading);
  const isKana = (char) => /[ぁ-ゖァ-ヺー]/u.test(char || '');

  let prefixLength = 0;
  while (
    prefixLength < surfaceChars.length &&
    prefixLength < readingChars.length &&
    surfaceChars[prefixLength] === readingChars[prefixLength] &&
    isKana(surfaceChars[prefixLength])
  ) prefixLength += 1;

  let suffixLength = 0;
  while (
    suffixLength < surfaceChars.length - prefixLength &&
    suffixLength < readingChars.length - prefixLength &&
    surfaceChars[surfaceChars.length - 1 - suffixLength] === readingChars[readingChars.length - 1 - suffixLength] &&
    isKana(surfaceChars[surfaceChars.length - 1 - suffixLength])
  ) suffixLength += 1;

  const prefix = surfaceChars.slice(0, prefixLength).join('');
  const suffix = suffixLength ? surfaceChars.slice(-suffixLength).join('') : '';
  const rubyBase = surfaceChars.slice(prefixLength, surfaceChars.length - suffixLength).join('');
  const rubyReading = readingChars.slice(prefixLength, readingChars.length - suffixLength).join('');

  if (!rubyBase || !rubyReading) {
    return <span className="furigana-plain cjk">{surface}</span>;
  }

  return (
    <span className="furigana-word cjk">
      {prefix}
      <ruby className="furigana-ruby">
        {rubyBase}
        <rp>（</rp><rt>{rubyReading}</rt><rp>）</rp>
      </ruby>
      {suffix}
    </span>
  );
}

function ComponentCard({ component, onOpen }) {
  return (
    <article className="component-card">
      <div className="component-topline">
        <GlyphBox component={component} size="large" />
        <div className="component-name">
          <strong>{component.hanViet || '—'}</strong>
          <span>{component.positionVi || component.position || 'thành phần'}</span>
          {component.role && <small>{component.role}</small>}
        </div>
        {component.children?.length > 0 && (
          <button
            type="button"
            className="recursive-button"
            onClick={() => onOpen(component)}
            aria-label={`Xem cấu tạo của ${component.component}`}
            title="Xem cấu tạo"
          >
            +
          </button>
        )}
      </div>

      <div className="component-detail">
        <span className="panel-label">Nghĩa</span>
        <p>{component.meaning || '—'}</p>
      </div>

      <div className="component-mnemonic">
        <span className="panel-label">Mẹo nhớ</span>
        <p>{component.mnemonic || '—'}</p>
      </div>
    </article>
  );
}

function GlyphBox({ component, size = 'normal' }) {
  const type = component.renderType || 'unicode';
  const value = component.renderValue || component.display || component.component;
  return (
    <div className={`glyph-box glyph-box--${size}`} aria-label={component.component || value}>
      {type === 'glyphwiki_svg' && String(value).startsWith('http') ? (
        <img src={value} alt={component.component || 'Thành phần chữ Hán'} />
      ) : type === 'ids_tree' ? (
        <IdsGlyph expression={value} />
      ) : type === 'entity_unresolved' ? (
        <span className="entity-glyph">{component.component}</span>
      ) : (
        <span className="cjk">{component.display || value}</span>
      )}
    </div>
  );
}

function RecursiveDialog({ component, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (component && !dialog.open) dialog.showModal();
    if (!component && dialog.open) dialog.close();
  }, [component]);

  const handleClose = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="recursive-dialog"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) handleClose(); }}
    >
      {component && (
        <div className="dialog-sheet">
          <header className="dialog-head">
            <div>
              <span className="dialog-label">Cấu tạo thành phần</span>
              <div className="dialog-title-row">
                <GlyphBox component={component} />
                <div>
                  <strong>{component.hanViet || component.component}</strong>
                  <span>{component.meaning || '—'}</span>
                </div>
              </div>
            </div>
            <button type="button" className="dialog-close" onClick={handleClose} aria-label="Đóng">×</button>
          </header>

          <div className="recursive-list">
            {component.children.map((child, index) => (
              <article className="recursive-child" key={`${child.component}-${index}`}>
                <GlyphBox component={child} />
                <div className="recursive-child-copy">
                  <strong>{child.hanViet || '—'}</strong>
                  <span>{child.meaning || '—'}</span>
                  <small>{child.positionVi || child.position || 'thành phần'}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}

function StrokeOrder({ kanji }) {
  const [geometry, setGeometry] = useState(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setGeometry(null);
    fetchStrokeSvg(kanji, attempt > 0)
      .then((text) => {
        if (!active) return;
        setGeometry(extractStrokeGeometry(text));
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => { active = false; };
  }, [kanji, attempt]);

  return (
    <div className="stroke-layout">
      <div className="stroke-board">
        {status === 'loading' && <div className="stroke-state">Đang tải…</div>}
        {status === 'error' && (
          <img className="stroke-fallback" src={kanjiVGSources(kanji)[0]} alt={`Thứ tự nét của ${kanji}`} />
        )}
        {status === 'ready' && geometry && (
          <svg className="stroke-svg" viewBox="0 0 109 109" role="img" aria-label={`Thứ tự nét của ${kanji}`}>
            {geometry.paths.map((d, index) => (
              <path
                key={`${attempt}-${index}`}
                className="stroke-path"
                d={d}
                pathLength="1"
                style={{ '--stroke-delay': `${index * 0.34}s` }}
              />
            ))}
            {geometry.labels.map((label, index) => (
              <text
                key={`label-${attempt}-${index}`}
                className="stroke-number"
                x={label.x || undefined}
                y={label.y || undefined}
                transform={label.transform || undefined}
                style={{ '--stroke-delay': `${index * 0.34 + 0.12}s` }}
              >
                {label.text}
              </text>
            ))}
          </svg>
        )}
      </div>
      <div className="stroke-actions">
        <button type="button" className="quiet-action" onClick={() => setAttempt((value) => value + 1)}>Vẽ lại</button>
        <span>KanjiVG · CC BY-SA 3.0</span>
      </div>
    </div>
  );
}

const IDS_ARITY = {
  '⿰': 2, '⿱': 2, '⿴': 2, '⿵': 2, '⿶': 2, '⿷': 2, '⿸': 2, '⿹': 2, '⿺': 2, '⿻': 2,
  '⿲': 3, '⿳': 3, '⿽': 2,
};

function tokeniseIds(expression) {
  const chars = Array.from(String(expression || ''));
  const tokens = [];
  for (let i = 0; i < chars.length; i += 1) {
    if (chars[i] === '&') {
      let token = '&';
      while (i + 1 < chars.length) {
        i += 1;
        token += chars[i];
        if (chars[i] === ';') break;
      }
      tokens.push(token);
    } else {
      tokens.push(chars[i]);
    }
  }
  return tokens;
}

function parseIds(expression) {
  const tokens = tokeniseIds(expression);
  let cursor = 0;
  const read = () => {
    const token = tokens[cursor++];
    if (!token) return null;
    const arity = IDS_ARITY[token];
    if (!arity) return { type: 'leaf', value: token };
    return { type: 'operator', operator: token, children: Array.from({ length: arity }, read).filter(Boolean) };
  };
  return read();
}

function IdsGlyph({ expression }) {
  const tree = useMemo(() => parseIds(expression), [expression]);
  if (!tree) return <span className="entity-glyph">{expression}</span>;
  return <IdsNode node={tree} />;
}

function IdsNode({ node }) {
  if (node.type === 'leaf') {
    return <span className={node.value.startsWith('&') ? 'ids-leaf ids-leaf--entity' : 'ids-leaf cjk'}>{node.value}</span>;
  }
  const horizontal = ['⿰', '⿲'].includes(node.operator);
  const vertical = ['⿱', '⿳'].includes(node.operator);
  const overlay = node.operator === '⿻';
  return (
    <span className={`ids-compose ${horizontal ? 'ids-compose--h' : ''} ${vertical ? 'ids-compose--v' : ''} ${overlay ? 'ids-compose--overlay' : ''}`}>
      {node.children.map((child, index) => <IdsNode key={index} node={child} />)}
    </span>
  );
}

export default App;
