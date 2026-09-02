# HT Kanji frontend

Vite + React frontend cho bộ flashcard Kanji.

## Runtime

- Node.js 24.x
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

## Deploy Vercel

Repo đã có `vercel.json` ở root với framework `vite`, `npm run build` và output `dist`. Node được pin bằng `engines.node = 24.x`, `.nvmrc` và `.node-version`. Import repository vào Vercel và deploy trực tiếp từ root.

## Data

`public/data/decks.json` là manifest.

- `public/data/sc1-p1.json` … `sc1-p9.json`: Sơ cấp 1, 400 chữ, giữ đúng thứ tự + 9 trang từ frontend 400 cũ.
- `public/data/sc2-p1.json` … `sc2-p8.json`: Sơ cấp 2, đúng 800 mục, 8 trang × 100.

Các trang được lưu dạng JSON tĩnh trong `public/data`, tương thích trực tiếp với Vercel CDN và không phụ thuộc vào `Content-Encoding` hay `DecompressionStream`.

Mỗi record đã được normalize cho UI: Hán Việt, nghĩa, On/Kun, mnemonic v6, component Level 1, recursive Level 2 và metadata vị trí. 52 mục bộ/thành phần đứng độc lập trong Sơ cấp 2 được giữ như atomic learning items.

## Furigana

Dữ liệu vẫn lưu dạng `語【ご】`, nhưng UI parse dữ liệu đó thành **native semantic ruby HTML**:

```html
<ruby>語<rp>（</rp><rt>ご</rt><rp>）</rp></ruby>
```

Okurigana chung ở cuối được tách ra khỏi ruby khi có thể, ví dụ `食べる【たべる】` render tương đương `<ruby>食<rt>た</rt></ruby>べる`.

## Thứ tự nét

Frontend lấy KanjiVG theo codepoint và chỉ tái dựng các `<path>`/số thứ tự nét trong SVG để animate. Có fallback ảnh SVG nếu fetch/parse animation thất bại.
