export async function loadManifest() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/decks.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Không tải được danh sách khóa (${response.status})`);
  return response.json();
}

export async function loadDeck(fileOrFiles) {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const chunks = await Promise.all(files.map(loadJsonResource));
  return chunks.flat();
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
