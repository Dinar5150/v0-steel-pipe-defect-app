
# 🛠️ Steel Pipe Defect Detection

This is a full-stack web application designed for the detection and visualization of defects in steel pipes. The application utilizes **Next.js** for the frontend and **FastAPI** for the backend.

---

## 📂 Project Structure

```
.
├── frontend (root directory)
├── backend/
│   └── app/         # FastAPI application
├── public/          # Static assets
├── styles/          # Tailwind CSS styles
├── components/      # Reusable UI components
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
```

---

## ✅ Prerequisites

Ensure the following tools are installed on your system:

* **Node.js** (v18 or higher)
* **npm**
* **Python** (version 3.9 or higher)
* **pip**

---

##  Getting Started

### 1. Frontend Setup (Next.js)

From the root directory, run the following commands:

```bash
npm install
npm run dev
```

The development server will start at: [http://localhost:3000](http://localhost:3000)

---

### 2. Backend Setup (FastAPI)

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment (optional but recommended):

```bash
# Linux/macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
uvicorn app:app --reload
```

The API will be available at: [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## Notes

* Ensure both frontend and backend servers are running simultaneously for the application to function correctly.
* CORS configuration may need to be updated in the backend (`app/main.py`) to allow communication from the frontend.

---




# 📦 Приложение для Обнаружения Дефектов Стальных Труб

Веб-приложение для визуализации и анализа дефектов стальных труб с использованием фронтенда на Next.js и бэкенда на FastAPI.

## 📁 Структура проекта

* `frontend` (корень проекта) — интерфейс пользователя (Next.js)
* `backend/app` — серверная часть на FastAPI

---

##  Установка и запуск

### 🔧 Требования

* Node.js (v18 или выше)
* Python 3.9+
* Установленные менеджеры пакетов `npm` и `pip`

---

### 1. Установка и запуск фронтенда

Перейдите в корень проекта и выполните команды:

```bash
npm install
npm run dev
```

Фронтенд запустится по адресу: [http://localhost:3000](http://localhost:3000)

---

### 2. Установка и запуск бэкенда

Перейдите в папку `backend`:

```bash
cd backend
```

Создайте и активируйте виртуальное окружение (опционально):

```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
```

Установите зависимости:

```bash
pip install -r requirements.txt
```

Запустите сервер:

```bash
uvicorn app:app --reload
```

Бэкенд будет доступен по адресу: [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

##  Примечания

* Убедитесь, что и фронтенд, и бэкенд работают одновременно для полноценного функционирования.
* При необходимости настройте CORS в `backend/app/main.py`.

---


