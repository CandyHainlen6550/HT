#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import re
import shutil
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOTSTRAP = ROOT / '.bootstrap'
PUBLIC_DATA = ROOT / 'public' / 'data'
DECK_JS = ROOT / 'src' / 'lib' / 'deck.js'

IMPORT_LINE = "import { applyLearnerDecomp, applyMnemonic, loadLearnerDecomp, loadMnemonics } from './learningOverlay.js';\n\n"
OLD_LOAD_DECK = """export async function loadDeck(fileOrFiles) {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const chunks = await Promise.all(files.map(loadJsonResource));
  return chunks.flat().map(normaliseLearnerCard);
}
"""
NEW_LOAD_DECK = """export async function loadDeck(fileOrFiles) {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const [chunks, learnerDecomp, mnemonics] = await Promise.all([
    Promise.all(files.map(loadJsonResource)),
    loadLearnerDecomp(),
    loadMnemonics(),
  ]);
  return chunks
    .flat()
    .map(normaliseLearnerCard)
    .map((card) => applyMnemonic(applyLearnerDecomp(card, learnerDecomp), mnemonics));
}
"""


def decode_archive() -> bytes:
    parts = sorted(BOOTSTRAP.glob('final_bundle.*.b64'))
    if not parts:
        raise SystemExit('No final bootstrap bundle chunks found')
    encoded = ''.join(part.read_text(encoding='ascii').strip() for part in parts)
    return base64.b64decode(encoded)


def extract_payload(archive_raw: bytes) -> tuple[bytes, bytes]:
    with tempfile.TemporaryDirectory() as tmp:
        archive = Path(tmp) / 'learning_data.tar.xz'
        archive.write_bytes(archive_raw)
        with tarfile.open(archive, mode='r:xz') as tf:
            names = set(tf.getnames())
            expected = {'learner_decomp.json', 'mnemonics.json'}
            if names != expected:
                raise SystemExit(f'Unexpected bootstrap archive members: {sorted(names)!r}')
            tf.extractall(tmp)
        return (Path(tmp) / 'learner_decomp.json').read_bytes(), (Path(tmp) / 'mnemonics.json').read_bytes()


def validate(learner_raw: bytes, mnemonic_raw: bytes) -> None:
    learner = json.loads(learner_raw)
    mnemonics = json.loads(mnemonic_raw)

    if not isinstance(mnemonics, dict) or len(mnemonics) != 2136:
        raise SystemExit(f'Expected 2136 mnemonics, got {len(mnemonics) if isinstance(mnemonics, dict) else type(mnemonics)}')
    if not isinstance(learner, dict) or not isinstance(learner.get('roots'), dict) or not isinstance(learner.get('meta'), dict):
        raise SystemExit('Learner decomposition payload has an invalid schema')

    for kanji in ('京', '愛', '調', '鳥'):
        if kanji not in mnemonics:
            raise SystemExit(f'Missing mnemonic regression key: {kanji}')

    if learner['roots'].get('京') != ['亠', '口', '小']:
        raise SystemExit(f"京 regression failed: {learner['roots'].get('京')!r}")
    if learner['roots'].get('愛') != ['⺤', '冖', '心', '夂']:
        raise SystemExit(f"愛 regression failed: {learner['roots'].get('愛')!r}")

    raw_entity = re.compile(r'&(?:CDP|AJ1|GT|MJ|U-|A-)[^;]*;')
    leaked = [kanji for kanji, text in mnemonics.items() if raw_entity.search(str(text))]
    if leaked:
        raise SystemExit(f'Raw technical entity leaked into learner mnemonic text: {leaked[:8]}')

    print(f'Learning data validated: {len(mnemonics)} mnemonics, {len(learner["roots"])} decomposable roots')


def patch_deck_loader() -> None:
    text = DECK_JS.read_text(encoding='utf-8')
    if IMPORT_LINE.strip() not in text:
        text = IMPORT_LINE + text

    if NEW_LOAD_DECK not in text:
        if OLD_LOAD_DECK not in text:
            raise SystemExit('deck.js loadDeck block changed; refusing unsafe automatic patch')
        text = text.replace(OLD_LOAD_DECK, NEW_LOAD_DECK, 1)

    DECK_JS.write_text(text, encoding='utf-8')


def main() -> None:
    if not BOOTSTRAP.exists():
        print('No .bootstrap directory; nothing to sync.')
        return

    learner_raw, mnemonic_raw = extract_payload(decode_archive())
    validate(learner_raw, mnemonic_raw)

    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DATA / 'learner_decomp.json').write_bytes(learner_raw)
    (PUBLIC_DATA / 'mnemonics.json').write_bytes(mnemonic_raw)
    patch_deck_loader()

    obsolete = ROOT / 'src' / 'lib' / 'finalOverlayV39.js'
    if obsolete.exists():
        obsolete.unlink()

    shutil.rmtree(BOOTSTRAP)
    print('Learning data synced to stable filenames.')


if __name__ == '__main__':
    main()
