# Задание

Задание проверяет понимание технологий и умение это понимание применять на практике на базе вашего существующего опыта.

Репозиторий содержит некоторе решение некоторой задачи. И задача и решене здесь приведены
только для наглядности. Ответ на каждый вопрос принимается исключительно про ваш реальный опыт над реальным проектом.
Мы ожидаем развернутых ответов.

Решением задания будет написание ответов на вопросы ниже. Ответ можно отправить в свободной форме.

---

# Ответы

## Аутентификация

### Ответ

На одном из крупных проектов — трейдинговая платформа для финансовой компании — мы использовали Auth0 в связке с OAuth 2.0. Фронтенд (React SPA) получал opaque access token через Auth0 SPA flow, а бэкенд (Symfony) валидировал его через introspection endpoint. То есть токен, который летал в каждом запросе, был коротким непрозрачным строковым идентификатором, а не раздутым JWT с payload.

Решение было осознанным. Платформа обрабатывала финансовые операции — нужна была возможность мгновенной инвалидации токена (заблокировать пользователя, отозвать сессию). JWT это не позволяет — пока TTL не истёк, токен валиден, и с этим ничего не сделаешь без дополнительной инфраструктуры (blacklist в Redis, что фактически убивает весь смысл stateless подхода). Opaque token + серверная валидация решали эту задачу чисто.

На другом проекте — онлайн-платформа на Nuxt 3 — я использовал токен в httpOnly cookie с флагами `sameSite: lax` и `secure: true`. Браузер отправляет cookie автоматически — не нужен `Authorization` header, нет ручного управления токенами на клиенте. Плюс — защита от XSS: JavaScript физически не имеет доступа к httpOnly cookie, в отличие от токена в localStorage.

Если бы я мог выбирать на трейдинговом проекте — JWT бы не выбрал. Причины: нужна мгновенная инвалидация, payload раздувает каждый запрос (а там ещё custom claims с ролями и permissions были бы), и всё равно пришлось бы ходить на сервер за актуальными правами пользователя.

Где бы выбрал JWT — в микросервисной архитектуре, где каждый сервис должен самостоятельно валидировать токен без обращения к центральному auth-серверу. Подписанный JWT позволяет это — достаточно публичного ключа. Это критично для горизонтального масштабирования, когда сервисы разнесены по разным дата-центрам и round-trip до auth-сервера недопустим.

Сейчас, оглядываясь назад, на любом новом проекте я бы делал: short-lived JWT (5–15 минут) + refresh token rotation + BFF (Backend-for-Frontend) паттерн, где токены никогда не покидают серверный контур. Клиент работает с сессионной cookie, а BFF подставляет токен при проксировании запросов. Это сочетает stateless валидацию на бэкенде с безопасностью на клиенте.

## Идентификация

### Ответ

На том же трейдинговом проекте все сущности (а их было порядка 300 в Doctrine ORM) использовали auto-increment integer в качестве primary key. UUID не применялся нигде. Проект существовал давно, схема эволюционировала через 700+ миграций, и integer ID был стандартом.

Проблема с integer ID всплыла, когда понадобилось мержить данные между окружениями. Staging-среда наполнялась тестовыми данными, и когда нужно было перенести часть записей в production, auto-increment ID коллизировали. Пришлось писать скрипты с ремаппингом ID и всех foreign key. С UUID этой проблемы не существовало бы в принципе — каждый идентификатор глобально уникален.

Но и с UUID сталкивался с проблемами. На одном из проектов была аналитическая таблица с высокой частотой записи — десятки тысяч INSERT в минуту. UUID v4 стоял как primary key, и со временем мы заметили деградацию производительности INSERT. Причина — B-tree индекс. UUID v4 генерирует случайные значения, и каждый новый INSERT попадает в произвольную страницу индекса, что вызывает постоянные page split. С auto-increment всё ложится последовательно в конец, и B-tree растёт линейно.

Решение нашлось в UUID v7 — он time-sortable, первые биты содержат timestamp. Это даёт монотонно возрастающие значения, как auto-increment, но с глобальной уникальностью UUID. После миграции на UUID v7 производительность INSERT вернулась к нормальным показателям.

Ещё один момент, скорее практический: UUID в URL — это 36 символов. Для пользовательских интерфейсов и логов это неудобно. `/user/550e8400-e29b-41d4-a716-446655440000` в логе читается хуже, чем `/user/42`. На проектах, где UUID использовался как internal ID, для внешних API я добавлял short slug или использовал base62-кодирование UUID.

Резюмируя: UUID хорош для распределённых систем и портативности данных между средами. Integer — для high-write OLTP и аналитики, где последовательность записи критична. UUID v7 — компромисс, который я бы сейчас рекомендовал как default для новых проектов.

## Организация кода

### Ответ

На трейдинговом проекте с Symfony бэкенд был построен на полноценном DI-контейнере: 68+ сервисов, repository pattern, event subscribers. И я могу сказать конкретно, где это принесло реальную пользу.

Когда в команду пришли три новых разработчика, модульная структура позволила им сразу взять в работу отдельные направления. Один занялся payment processing, другой — KYC-верификацией, третий — отчётностью. Они могли работать параллельно, не мешая друг другу, потому что каждый модуль имел чёткие границы: свои сервисы, свои репозитории, свои event listeners. DI делал мокание тривиальным — unit-тесты писались быстро, потому что зависимости подменялись через конструктор.

Но была и серьёзная боль. User entity вырос до 4 700 строк. Классический God object — на нём висело всё: персональные данные, KYC-статусы, настройки аккаунта, привязки к платёжным системам, флаги верификации. DI-контейнер парадоксально маскировал проблему: любой сервис мог инжектить User и получить доступ ко всему. Никто не чувствовал боли, пока запросы к БД не начали деградировать — SELECT с 40+ колонками на таблице с миллионами записей. Надо было давно декомпозировать: User, UserProfile, UserKyc, UserSettings — каждый со своим lifecycle.

На Nuxt 3 проекте я использовал composables — `useAuth()`, `useKycLevels()`, `useBonus()`. Это лёгкая альтернатива DI: чистые функции, которые компонуются. Нет контейнера, нет регистрации модулей, нет церемонии. Для фронтенда это быстрее и понятнее. Но есть trade-off — без DI-контейнера мокать composables в тестах сложнее, приходится использовать vi.mock() или подобные хаки.

В NestJS, который используется в этом проекте, мне нравится баланс: декораторы дают удобство (@Controller, @Injectable), модули — чёткие границы, а DI — тестируемость. Для малых и средних API это оптимально. Для большого проекта важнее не сам паттерн, а его последовательное применение. На Symfony-проекте часть сервисов работала через repository, часть — напрямую через Doctrine EntityManager. Эта непоследовательность путала новичков больше, чем отсутствие паттерна вообще.

## Реактивность

### Ответ

На трейдинговом проекте (React 16 + Redux + Redux-Saga) у нас была страница настроек аккаунта — форма с 50+ полями, разбитыми по секциям. Каждый keystroke в любом поле диспатчил action в Redux, что вызывало обновление глобального стейта и ре-рендер всей формы. Пользователь набирал текст — и интерфейс подлагивал. Решали это обёрткой каждого поля в `React.memo` и использованием `reselect` для мемоизации селекторов. Работало, но объём boilerplate был несоразмерен задаче — по сути, мы вручную оптимизировали то, что фреймворк должен был делать сам.

На Nuxt 3 (Vue 3) я увидел принципиально другой подход. Vue использует Proxy-based reactivity — зависимости отслеживаются автоматически на уровне свойств объекта. `computed()` пересчитывается только тогда, когда реально изменились его зависимости. Не нужно указывать dependency array, не нужно `useMemo`/`useCallback`. Это устранило целый класс багов, которые мы имели в React-кодобазе: stale closures из-за замыканий, забытые зависимости в `useEffect`, неожиданные бесконечные ре-рендеры.

Был случай, когда реактивность реально мешала. На том же Nuxt-проекте мы интегрировали игровой модуль с canvas-анимациями. Анимация должна работать на 60 fps — requestAnimationFrame каждые 16мс. Если оборачивать координаты объектов в reactive(), Vue начинает отслеживать каждое изменение, триггерить watchers и обновлять DOM. На 60 fps это убийственный overhead. Решение — вынести игровую логику за пределы реактивной системы Vue. Использовали обычные переменные + requestAnimationFrame + прямые манипуляции с canvas context. Vue управлял только UI вокруг canvas (кнопки, счёт, меню), а сам canvas — vanilla JS.

Конкретно по React — что доставляет неудобства:

1. **`useEffect` + dependency array** — главный источник багов. Забыл зависимость — получил stale closure, добавил лишнюю — получил бесконечный цикл. ESLint правило `exhaustive-deps` помогает, но часто заставляет переструктурировать код не ради логики, а ради удовлетворения линтера.

2. **`useMemo` / `useCallback`** — boilerplate, которого в Vue просто не существует. Каждую функцию, передаваемую в дочерний компонент, нужно оборачивать в `useCallback`, иначе ребёнок ре-рендерится каждый раз. В Vue `computed()` и обычные методы работают без этой обёртки.

3. **Отсутствие гранулярной реактивности** — React ре-рендерит весь компонент при изменении любого state. Vue обновляет только те DOM-элементы, которые реально зависят от изменившегося значения. Для форм с множеством полей разница ощутима.

React 19 с серверными компонентами и автоматической мемоизацией через компилятор двигается в правильном направлении. Но на момент работы с React 16 — ручное управление ре-рендерами съедало значительную часть времени разработки.

---

# The Last of Guss

A browser-based clicker game built as a fullstack monorepo. Players tap a goose during timed rounds to earn points. Features JWT authentication, role-based access, real-time countdowns and race-condition-safe tap processing.

## Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Backend  | NestJS, Sequelize, PostgreSQL, JWT          |
| Frontend | React 19, Vite, React Router                |
| Shared   | TypeScript contract package (types + utils) |

## Architecture

```
eng-test/
├── contract/   # Shared TypeScript types, score formula, status computation
├── server/     # NestJS REST API (stateless, horizontally scalable)
└── client/     # React SPA (Vite dev server)
```

Key design decisions:

- **Computed round status** — status (`cooldown` | `active` | `finished`) is derived from `start_datetime` / `end_datetime` timestamps at read time, never stored. Single source of truth shared between server and client.
- **Race condition safety** — tap processing uses `SELECT FOR UPDATE` inside a serialized transaction to prevent concurrent score corruption.
- **Score formula** — `1 tap = 1 point`, every 11th tap awards `10 points` instead of 1.
- **Nikita rule** — user `Никита` receives HTTP 200 on taps, but the counter is never incremented (score stays 0).

## Prerequisites

- **Node.js** >= 20
- **Docker** (for PostgreSQL)

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Configure environment
cp server/.env.example server/.env

# 3. Build shared contract
cd contract
npm install
npm run build

# 4. Start backend
cd ../server
npm install
npm run build
npm start

# 5. Start frontend (separate terminal)
cd ../client
npm install
npm run dev
```

The client runs at `http://localhost:5173`, the API at `http://localhost:3000`.

## Environment Variables

Copy `server/.env.example` to `server/.env` and adjust if needed:

| Variable            | Default                                                  | Description                  |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| `DB_URI`            | `postgresql://postgres:postgres@localhost:6543/postgres` | PostgreSQL connection string |
| `PORT`              | `3000`                                                   | Server listen port           |
| `JWT_SECRET`        | `guss-secret-key-change-in-production`                   | JWT signing secret           |
| `COOLDOWN_DURATION` | `30`                                                     | Seconds before round starts  |
| `ROUND_DURATION`    | `60`                                                     | Round duration in seconds    |
| `CLIENT_ORIGIN`     | `http://localhost:5173`                                  | Allowed CORS origin          |

## Test Credentials

Any username/password pair auto-registers on first login. Pre-configured roles:

| Username  | Password | Role   | Notes                           |
| --------- | -------- | ------ | ------------------------------- |
| `admin`   | `admin`  | admin  | Can create new rounds           |
| `roma`    | `roma`   | user   | Regular player                  |
| `Никита`  | any      | nikita | Taps accepted but score stays 0 |
| any other | any      | user   | Auto-registered on first login  |

## API Endpoints

All endpoints except `/auth` require `Authorization: Bearer <token>` header.

| Method | Path           | Description                   | Auth  |
| ------ | -------------- | ----------------------------- | ----- |
| POST   | `/auth`        | Login / register              | No    |
| GET    | `/rounds`      | List active + cooldown rounds | Yes   |
| GET    | `/round/:uuid` | Round details + user score    | Yes   |
| POST   | `/tap`         | Tap the goose                 | Yes   |
| POST   | `/round`       | Create a new round            | Admin |
