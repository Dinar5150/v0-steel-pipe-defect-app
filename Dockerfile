# Этап сборки
FROM node:20 AS builder

WORKDIR /app

# Копируем только файлы, необходимые для установки зависимостей
COPY package.json pnpm-lock.yaml ./

# Устанавливаем pnpm
RUN npm install -g pnpm

# Устанавливаем зависимости
RUN pnpm install

# Копируем только файлы, которые влияют на сборку
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./
COPY components.json ./

# Копируем исходный код (node_modules уже исключены через .dockerignore)
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY styles ./styles
COPY hooks ./hooks
COPY context ./context

# Устанавливаем переменные окружения
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# Собираем приложение
RUN pnpm build

# Этап production
FROM node:20-slim AS runner

WORKDIR /app

# Устанавливаем pnpm
RUN npm install -g pnpm

# Копируем только необходимые файлы
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Устанавливаем только production зависимости
RUN pnpm install --prod

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["pnpm", "start"]