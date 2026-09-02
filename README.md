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


## Quy tắc decomposition UI

Frontend **luôn render cấu tạo nhìn thấy của chữ hiện đại** từ `kanji_visual_components_l1` / `current_visual_ids`.
`origin_ids` chỉ dùng trong phần nguồn gốc/tự nguyên, không được dùng làm component cards.

Ví dụ bắt buộc:
- `間` hiện đại = `⿵門日` → card phải là **門 + 日**.
- Dạng lịch sử/origin có thể là `閒 = ⿵門月`; thông tin này chỉ xuất hiện trong phần tự nguyên.
- Recursive chỉ mở khi decomposition cấp dưới đủ rõ cho người học; không mở các mảnh kỹ thuật vô nghĩa như decomposition nội bộ của `門`.


## Full Formation rendering

Back card renders the complete `kanji_formation.csv` evidence instead of only the short `etymology` sentence:

- selected formation type and quality
- current visual IDS
- historical/origin character and IDS
- whether historical form differs
- conflict warning
- every item from `formation_claims_json` with type, scope, source and **full detail text**
- source links when the database contains them

The UI does not reconcile conflicting claims. It preserves the source-level disagreement. Visual component cards still use `current_visual_ids`; origin/formation evidence stays in the separate “Nguồn gốc cấu tạo” section.


## Formation UI v6

- `Nguồn gốc cấu tạo` **collapsed mặc định** bằng native `<details>`.
- Field provenance `formation.originPath` trong data được giữ nguyên theo hướng **chữ hiện tại → dạng cũ/gốc** để audit.
- UI `Biến đổi dạng` cố ý render theo chiều lịch sử **dạng gốc → chữ hiện tại**.
  - `内 → 內` (raw provenance) sẽ hiển thị `內 → 内`.
  - `万 → 萬 → 𥝅` (raw provenance) sẽ hiển thị `𥝅 → 萬 → 万`.
- Không sửa/ngược dữ liệu nguồn; chỉ đổi presentation direction ở UI.
