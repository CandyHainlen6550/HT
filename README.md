# HT Kanji frontend

Vite + React frontend cho bộ flashcard Kanji.

## Runtime

- Node.js 24+
- Vite latest
- React latest

## Chạy local

```bash
nvm use 24
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data

`public/data/decks.json` là manifest.

- `public/data/sc1.json`: Sơ cấp 1, 400 chữ, giữ đúng thứ tự + 9 trang từ frontend 400 cũ.
- `public/data/sc2.json`: Sơ cấp 2, đúng 800 mục, 8 trang × 100.

Mỗi record đã được normalize cho UI: Hán Việt, nghĩa, On/Kun, mnemonic v6, component Level 1, recursive Level 2 và metadata vị trí. 52 mục bộ/thành phần đứng độc lập trong Sơ cấp 2 được giữ như atomic learning items.

## Thứ tự nét

Frontend lấy KanjiVG theo codepoint và chỉ tái dựng các `<path>`/số thứ tự nét trong SVG để animate. Có fallback ảnh SVG nếu fetch/parse animation thất bại.
