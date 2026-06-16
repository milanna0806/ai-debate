# ⚔️ AI Debate Arena

Два ИИ-бота спорят друг с другом в реальном времени. Арбитр выносит вердикт.

## Как задеплоить на Vercel

### Шаг 1: Загрузи на GitHub

```bash
git init
git add .
git commit -m "AI Debate Arena"
git remote add origin https://github.com/YOUR_USERNAME/ai-debate-arena.git
git push -u origin main
```

### Шаг 2: Задеплой на Vercel

1. Зайди на [vercel.com](https://vercel.com)
2. Нажми **"New Project"**
3. Выбери свой репозиторий
4. В разделе **Environment Variables** добавь:
   - `ANTHROPIC_API_KEY` = твой ключ с [console.anthropic.com](https://console.anthropic.com)
5. Нажми **Deploy**

### Локальный запуск

```bash
cp .env.example .env.local
# Добавь свой ключ в .env.local
npm install
npm run dev
```

Открой http://localhost:3000

## Функции

- 🔵 **ALPHA** — агрессивный оптимист, использует факты
- 🟠 **BETA** — скептичный аналитик, любит сарказм
- ⚖️ **Арбитр** — анализирует дебаты и выносит вердикт
- 📊 **Статистика** — слова, реплики, согласия
- 🎯 **6 готовых тем** + своя тема
- **4 раунда** дебатов

## Стек

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Anthropic Claude API
