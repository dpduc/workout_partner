# 👤 Agent Preferences — Workout Partner

> File này lưu các preferences cá nhân của developer để agent hiểu phong cách làm việc và đưa ra quyết định phù hợp.
> Cập nhật bất cứ khi nào bạn muốn thay đổi cách agent hoạt động.

---

## 🎨 Design Preferences

### Visual Style
- **Color palette**: Tông xanh-tím (electric blue / violet), gradient sắc nét, không dùng màu đơn giản (red/blue/green thuần)
- **Accent color chính**: `#6C63FF` (electric violet) + `#00D4FF` (cyan highlight)
- **Glassmorphism**: Dùng cho cards, panels (`backdrop-filter: blur`)
- **Typography**: Google Fonts — `Inter` 

- **Icons**: SVG inline hoặc emoji — không dùng icon font library (giữ nhẹ)

### UI/UX
- Ưu tiên **thông tin thực tế** (counter, timer) phải **rõ ràng và to** 
- Camera feed nên chiếm phần lớn màn hình trên workout page
- Skeleton overlay màu `#00D4FF` (cyan) cho landmarks, `#6C63FF` (violet) cho bones/connections
- Rep counter: font size vừa phải, rõ ràng, dễ đọc

---

## 💻 Code Style Preferences

### General
- **Ngôn ngữ comment**: Tiếng Anh trong code, tiếng Việt trong conversation
- **Naming convention**: camelCase JS, snake_case Python
- **No over-engineering**: MVP trước, refactor sau. Không cần design pattern phức tạp nếu chưa cần.
- **No TypeScript**: Vanilla JS thuần cho frontend (đủ cho scope này)

### JavaScript
- ES Modules (`import/export`) — không dùng CommonJS
- Async/await — không dùng callback hell hoặc `.then()` chain dài
- JSDoc comment cho public functions của các modules
- Xử lý lỗi rõ ràng với `try/catch` và thông báo user-friendly

### Python
- **FastAPI**: Router-based structure, mỗi domain 1 file trong `app/api/`
- **SQLAlchemy**: Async mode (`async_sessionmaker`, `AsyncSession`)
- **Pydantic v2**: Dùng `model_config = ConfigDict(...)` thay vì `class Config`
- Type hints đầy đủ cho tất cả function signatures
- Docstring cho các endpoint (`description` trong FastAPI decorator)

### CSS
- **CSS Variables** cho toàn bộ design tokens (màu, spacing, radius, shadow)
- Không dùng `!important` trừ khi bắt buộc
- Mobile-first responsive (breakpoint: 768px tablet, 1024px desktop)
- Prefix biến: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`

---

## 🤖 Agent Behavior Preferences

### Communication
- Giải thích ngắn gọn trước khi code — đừng dump code mà không nói tại sao
- Nếu có nhiều lựa chọn kỹ thuật, hỏi trước thay vì tự quyết định (đặc biệt với breaking changes)
- Dùng tiếng Việt trong conversation, tiếng Anh trong code/comments
- Highlight những điểm cần người dùng action (chạy command, điền config)

### Code Generation
- Tạo file hoàn chỉnh thay vì snippet rời rạc khi có thể
- Ưu tiên **chạy được ngay** (working code > perfect code trong MVP)
- Luôn thêm error handling cơ bản (không để app crash im lặng)
- Khi tạo component mới: theo pattern đã có trong project

### Task Management
- Cập nhật `PROJECT.md` Feature Tracker khi hoàn thành 1 feature
- Cập nhật `CONTEXT.md` khi thêm dependency hoặc thay đổi API contract
- Ghi changelog ngắn trong `PROJECT.md` mỗi khi có thay đổi đáng kể

---

## 🚫 Anti-Preferences (Không làm)

- ❌ Không thêm TypeScript nếu không được yêu cầu rõ ràng
- ❌ Không thêm dependency mới mà không giải thích tại sao
- ❌ Không tự ý thêm tính năng ngoài scope đang làm
- ❌ Không dùng TailwindCSS (đã chọn Vanilla CSS)
- ❌ Không dùng React/Vue (Vanilla JS cho MVP này)
- ❌ Không commit secret (DATABASE_URL, API keys) vào file tracked bởi git
- ❌ Không bỏ qua CORS khi tích hợp frontend-backend

---

## 🔧 Development Environment

- **OS**: Windows
- **Shell**: PowerShell
- **IDE**: Cursor / VS Code
- **Browser target**: Chrome / Edge (cần WASM support cho MediaPipe)
- **Node**: via npm (không dùng yarn/pnpm trừ khi được yêu cầu)
- **Python**: pip + venv (không dùng conda/poetry trừ khi được yêu cầu)
- **PostgreSQL**: chạy local (hoặc Docker)

---

## 📋 Workflow Ưa Thích

1. **Plan trước**: Với task lớn, tạo implementation plan, chờ approve
2. **Build từng module**: Hoàn chỉnh 1 module trước khi sang module khác
3. **Test thủ công**: Chạy và kiểm tra trực quan trong browser
4. **Commit thường xuyên**: Mỗi feature nhỏ = 1 commit có ý nghĩa

---

## 📝 Notes Cá Nhân

<!-- Thêm ghi chú trong quá trình phát triển -->
- 2026-06-20: Bắt đầu dự án. Stack: Vite + FastAPI + PostgreSQL
- Jumping Jack là exercise demo đầu tiên, thêm Squat/Push-up/Plank sau
- Audio beep được yêu cầu (Web Audio API, không dùng file âm thanh external)
