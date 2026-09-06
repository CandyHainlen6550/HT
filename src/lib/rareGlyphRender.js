// Supplementary CJK often has no glyph in the browser's installed Japanese fonts.
// Keep the canonical Unicode character in source data, but hydrate it to a GlyphWiki
// SVG in learner-facing UI. If the SVG cannot load, fall back to the Unicode text.
const SUPPLEMENTARY_CJK_RANGES = Object.freeze([
  [0x20000, 0x2a6df],
  [0x2a700, 0x2b73f],
  [0x2b740, 0x2b81f],
  [0x2b820, 0x2ceaf],
  [0x2ceb0, 0x2ebef],
  [0x2f800, 0x2fa1f],
  [0x30000, 0x3134f],
]);

const TARGET_SELECTOR = '.cjk, .mnemonic-panel p, .component-mnemonic p, .ids-leaf';
const SKIP_SELECTOR = '[data-rare-glyph], script, style, textarea';

export function isSupplementaryCjk(value) {
  const chars = Array.from(String(value || ''));
  if (chars.length !== 1) return false;
  const cp = chars[0].codePointAt(0);
  return SUPPLEMENTARY_CJK_RANGES.some(([start, end]) => cp >= start && cp <= end);
}

export function glyphWikiUnicodeUrl(value) {
  if (!isSupplementaryCjk(value)) return '';
  const cp = Array.from(String(value))[0].codePointAt(0);
  return `https://glyphwiki.org/glyph/u${cp.toString(16)}.svg`;
}

function rareCharsIn(text) {
  return Array.from(String(text || '')).some(isSupplementaryCjk);
}

function buildRareGlyph(char) {
  const wrap = document.createElement('span');
  wrap.className = 'rare-glyph-inline';
  wrap.dataset.rareGlyph = char;
  wrap.title = `U+${char.codePointAt(0).toString(16).toUpperCase()}`;

  const image = document.createElement('img');
  image.className = 'rare-glyph-image';
  image.src = glyphWikiUnicodeUrl(char);
  image.alt = char;
  image.decoding = 'async';
  image.addEventListener('error', () => {
    wrap.classList.add('rare-glyph-inline--fallback');
    wrap.replaceChildren(document.createTextNode(char));
  }, { once: true });

  wrap.appendChild(image);
  return wrap;
}

function hydrateTextNode(node) {
  if (!(node instanceof Text)) return;
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP_SELECTOR) || !rareCharsIn(node.nodeValue)) return;

  const fragment = document.createDocumentFragment();
  for (const char of Array.from(node.nodeValue || '')) {
    fragment.appendChild(isSupplementaryCjk(char) ? buildRareGlyph(char) : document.createTextNode(char));
  }
  node.replaceWith(fragment);
}

function hydrateTarget(target) {
  if (!(target instanceof Element) || target.closest('[data-rare-glyph]')) return;
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(hydrateTextNode);
}

function hydrateTree(root) {
  if (!(root instanceof Element || root instanceof Document)) return;
  if (root instanceof Element && root.matches(TARGET_SELECTOR)) hydrateTarget(root);
  root.querySelectorAll(TARGET_SELECTOR).forEach(hydrateTarget);
}

export function installRareGlyphRenderer(root) {
  if (!(root instanceof Element)) return () => {};
  hydrateTree(root);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent?.closest(TARGET_SELECTOR)) hydrateTextNode(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) hydrateTree(node);
        else if (node instanceof Text && node.parentElement?.closest(TARGET_SELECTOR)) hydrateTextNode(node);
      });
    }
  });

  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
