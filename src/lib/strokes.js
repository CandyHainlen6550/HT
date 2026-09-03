const cache = new Map();

export function kanjiVGFilename(kanji) {
  const char = Array.from(String(kanji || ''))[0];
  if (!char) return '';
  return `${char.codePointAt(0).toString(16).toLowerCase().padStart(5, '0')}.svg`;
}

export function kanjiVGSources(kanji) {
  const filename = kanjiVGFilename(kanji);
  return [
    `https://kanjivg.tagaini.net/kanjivg/kanji/${filename}`,
    `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${filename}`,
  ];
}

export async function fetchStrokeSvg(kanji, force = false) {
  if (!force && cache.has(kanji)) return cache.get(kanji);
  let lastError;
  for (const url of kanjiVGSources(kanji)) {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text.includes('<svg')) throw new Error('Phản hồi không phải SVG');
      cache.set(kanji, text);
      return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('KanjiVG unavailable');
}

export function extractStrokeGeometry(svgText) {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('SVG không hợp lệ');
  const paths = [...parsed.querySelectorAll('path[d]')].map((path) => path.getAttribute('d'));
  const labels = [...parsed.querySelectorAll('text')].map((node) => ({
    text: node.textContent,
    x: node.getAttribute('x'),
    y: node.getAttribute('y'),
    transform: node.getAttribute('transform'),
  }));
  if (!paths.length) throw new Error('Không tìm thấy nét');
  return { paths, labels };
}
