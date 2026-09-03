const HAN_VIET_MULTI_READING_FIXES = Object.freeze({
  // Generated from the user's canonical Jōyō 2,136 source. The frontend deck
  // build had kept only the first reading for comma-separated Hán-Việt values.
  '中': 'Trung, Trúng',
  '付': 'Phó, Phụ',
  '伝': 'Truyền, Truyện',
  '住': 'Trú, Trụ',
  '分': 'Phân, Phần',
  '占': 'Chiếm, Chiêm',
  '強': 'Cường, Cưỡng',
  '弾': 'Đàn, Đạn',
  '帳': 'Trương, Trướng',
  '台': 'Đài, Thai',
  '命': 'Mệnh, Mạng',
  '好': 'Hiếu, Hảo',
  '少': 'Thiểu, Thiếu',
  '将': 'Tướng, Tương',
  '著': 'Trứ, Trước',
  '当': 'Đương, Đáng',
  '為': 'Vi, Vị',
  '断': 'Đoạn, Đoán',
  '思': 'Tư, Tứ',
  '悪': 'Ác, Ố',
  '慢': 'Mạn, Mãn',
  '易': 'Dị, Dịch',
  '暴': 'Bạo, Bộc',
  '楽': 'Nhạc, Lạc',
  '称': 'Xưng, Xứng',
  '監': 'Giám, Giam',
  '画': 'Họa, Hoạch',
  '相': 'Tương, Tướng',
  '興': 'Hứng, Hưng',
  '行': 'Hành, Hàng',
  '臭': 'Khứu, Xú',
  '要': 'Yêu, Yếu',
  '処': 'Xứ, Xử',
  '調': 'Điều, Điệu',
  '重': 'Trọng, Trùng',
  '長': 'Trường, Trưởng',
  '間': 'Gian, Gián',
  '難': 'Nan, Nạn',
});

const LEARNER_COMPONENT_EXPANSIONS = Object.freeze({
  // 夢 is visually ⿱(⿳艹⺫冖)夕. The canonical L1 tree therefore has two children,
  // but the first child is a structural wrapper with no learner-facing metadata.
  // Expand only this wrapper for the study cards so the learner sees the useful
  // visual pieces while the canonical IDS/origin data remains unchanged.
  '⿳艹⺫冖': Object.freeze([
    Object.freeze({
      component: '艹',
      display: '艹',
      renderType: 'unicode',
      renderValue: '艹',
      glyphwikiName: '',
      hanViet: 'Thảo',
      meaning: 'cỏ',
      mnemonic: 'Hai mầm cỏ nhú ở phía trên; đó là 艹.',
      position: 'top',
      positionVi: 'phía trên',
      role: 'thành phần hình thể',
      source: 'parent IDS subtree',
      children: [],
    }),
    Object.freeze({
      component: '⺫',
      display: '⺫',
      renderType: 'unicode',
      renderValue: '⺫',
      glyphwikiName: '',
      hanViet: 'Mục/Võng',
      meaning: 'mắt / lưới ở phía trên',
      mnemonic: '⺫ gợi hình con mắt hoặc tấm lưới nằm ngang.',
      position: 'middle',
      positionVi: 'ở giữa',
      role: 'thành phần hình thể',
      source: 'parent IDS subtree',
      children: [],
    }),
    Object.freeze({
      component: '冖',
      display: '冖',
      renderType: 'unicode',
      renderValue: '冖',
      glyphwikiName: '',
      hanViet: 'Mịch',
      meaning: 'khăn trùm, che đậy',
      mnemonic: '冖 như một tấm khăn phủ lên phía trên.',
      position: 'bottom',
      positionVi: 'phía dưới',
      role: 'thành phần hình thể',
      source: 'parent IDS subtree',
      children: [],
    }),
  ]),
});

function expandLearnerComponents(components) {
  if (!Array.isArray(components) || components.length === 0) return components || [];

  let changed = false;
  const expanded = components.flatMap((component) => {
    const replacement = LEARNER_COMPONENT_EXPANSIONS[component?.component];
    if (!replacement) return [component];
    changed = true;
    return replacement.map((entry) => ({ ...entry }));
  });

  return changed ? expanded : components;
}

function normaliseLearnerCard(card) {
  const components = expandLearnerComponents(card?.components);
  const hanViet = HAN_VIET_MULTI_READING_FIXES[card?.kanji] || card?.hanViet;

  if (components === card?.components && hanViet === card?.hanViet) return card;
  return { ...card, hanViet, components };
}

export async function loadManifest() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/decks.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Không tải được danh sách khóa (${response.status})`);
  return response.json();
}

export async function loadDeck(fileOrFiles) {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const chunks = await Promise.all(files.map(loadJsonResource));
  return chunks.flat().map(normaliseLearnerCard);
}

async function loadJsonResource(file) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status})`);

  if (file.endsWith('.gz') || file.endsWith('.bin')) {
    if (!response.body || !('DecompressionStream' in globalThis)) {
      throw new Error('Trình duyệt này chưa hỗ trợ giải nén dữ liệu học.');
    }
    const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(decompressed).text());
  }

  return response.json();
}

export function normaliseSearch(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function cardMatches(card, query) {
  const needle = normaliseSearch(query);
  if (!needle) return true;
  const haystack = normaliseSearch([
    card.kanji,
    card.hanViet,
    card.meaning,
    card.on,
    card.kun,
    card.kunWords,
    card.furigana,
  ].filter(Boolean).join(' '));
  return haystack.includes(needle);
}

export function deterministicShuffle(items, seed) {
  const output = [...items];
  let state = (Number(seed) || 1) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function stableDirection(cardId) {
  let hash = 0;
  for (const char of String(cardId || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 2 === 0 ? 'kanji' : 'hanviet';
}
