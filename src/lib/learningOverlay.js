let learnerDecompPromise = null;
let mnemonicPromise = null;

function cap(value) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toLocaleUpperCase('vi') + text.slice(1) : '';
}

export function loadLearnerDecomp() {
  if (!learnerDecompPromise) {
    learnerDecompPromise = fetch(`${import.meta.env.BASE_URL}data/learner_decomp.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được learner decomposition (${response.status})`);
        return response.json();
      });
  }
  return learnerDecompPromise;
}

export function loadMnemonics() {
  if (!mnemonicPromise) {
    mnemonicPromise = fetch(`${import.meta.env.BASE_URL}data/mnemonics.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được mnemonic (${response.status})`);
        return response.json();
      });
  }
  return mnemonicPromise;
}

function buildComponent(identity, data, existingByKey, path = []) {
  const meta = data?.meta?.[identity] || {};
  const existing = existingByKey.get(identity) || {};
  const cycle = path.includes(identity);
  const childKeys = cycle ? [] : (data?.decomp?.[identity] || []);
  const display = meta.display || existing.display || identity;

  return {
    ...existing,
    component: identity,
    display,
    renderType: meta.renderType || existing.renderType || 'unicode',
    renderValue: meta.renderValue || existing.renderValue || display,
    glyphwikiName: meta.glyphwikiName || existing.glyphwikiName || '',
    hanViet: cap(meta.hanViet || existing.hanViet),
    meaning: meta.meaning || existing.meaning || '',
    mnemonic: meta.mnemonic || existing.mnemonic || '',
    role: existing.role || 'thành phần hình thể',
    position: existing.position || '',
    positionVi: existing.positionVi || 'thành phần hình thể',
    family: meta.family || '',
    sourceIdentity: meta.sourceIdentity || identity,
    exactAlias: meta.exactAlias || '',
    familyHint: meta.familyHint || '',
    children: childKeys.map((child) => buildComponent(child, data, existingByKey, [...path, identity])),
  };
}

export function applyLearnerDecomp(card, data) {
  if (!card || !data?.roots) return card;
  const roots = data.roots[card.kanji];
  if (!Array.isArray(roots) || roots.length === 0) return card;

  const existingByKey = new Map();
  const visit = (component) => {
    if (!component || typeof component !== 'object') return;
    const key = component.component || component.display || component.renderValue;
    if (key && !existingByKey.has(key)) existingByKey.set(key, component);
    (component.children || []).forEach(visit);
  };
  (card.components || []).forEach(visit);

  return {
    ...card,
    components: roots.map((identity) => buildComponent(identity, data, existingByKey)),
    decompositionBasis: 'learner_visual',
    decompositionSchemaVersion: data.schemaVersion || '',
  };
}

export function applyMnemonic(card, mnemonicMap) {
  if (!card || !mnemonicMap) return card;
  const mnemonic = mnemonicMap[card.kanji];
  if (!mnemonic) return card;
  return { ...card, mnemonic, mnemonicVersion: 'current' };
}
