let learnerDecompPromise = null;
let mnemonicV7Promise = null;

function cap(value) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toLocaleUpperCase('vi') + text.slice(1) : '';
}

export function loadLearnerDecompV3() {
  if (!learnerDecompPromise) {
    learnerDecompPromise = fetch(`${import.meta.env.BASE_URL}data/learner_decomp_v3.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được learner decomposition v3 (${response.status})`);
        return response.json();
      });
  }
  return learnerDecompPromise;
}

export function loadMnemonicV7() {
  if (!mnemonicV7Promise) {
    mnemonicV7Promise = fetch(`${import.meta.env.BASE_URL}data/mnemonic_v7_overlay_all_2136.json`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được mnemonic V7 (${response.status})`);
        return response.json();
      });
  }
  return mnemonicV7Promise;
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

export function applyLearnerDecompV3(card, data) {
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

  const components = roots.map((identity) => buildComponent(identity, data, existingByKey));
  return {
    ...card,
    components,
    decompositionBasis: 'learner_decomp_v3_visual',
    decompositionSchemaVersion: data.schemaVersion || '3.1',
  };
}

export function applyMnemonicV7(card, mnemonicMap) {
  if (!card || !mnemonicMap) return card;
  const mnemonic = mnemonicMap[card.kanji];
  if (!mnemonic) return card;
  return { ...card, mnemonic, mnemonicVersion: 'v7-final-2136' };
}
