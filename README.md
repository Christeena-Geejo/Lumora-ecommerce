# Lumora — Multi-Vendor E-Commerce Platform

Lumora is a modern, feature-rich, multi-vendor (Amazon-like) e-commerce platform. It features a Django/DRF backend, asynchronous background task processing using Celery & RabbitMQ, live websocket communications via Django Channels, resilient MongoDB error logging, and a lightweight, dynamic vanilla JS frontend.

---

## 🚀 Key Features

* **Multi-Role Authorization**: Secure customer, seller/manager, and administrator portals powered by JWT (Access + Refresh tokens).
* **Dynamic Shop Catalog**: Completely database-driven catalog with advanced category filtering, price ranges, and search.
* **Product Approval Pipeline**: Products created by shop managers are held in **Pending** status until approved and published by system administrators.
* **Asynchronous Task Architecture**: Offloads resource-heavy operations like email notifications and product average rating updates to **Celery Workers** using **RabbitMQ** as a message broker.
* **Resilient Logging**: A custom logging handler captures `ERROR` and `CRITICAL` logs and persists them to **MongoDB** lazily (failing gracefully without crashing the app if MongoDB is offline).
* **Interactive Chat & Tracking**: Live WebSockets-based order updates and customer service chat powered by **Django Channels** and **Redis**.
* **Wallet & Loyalty System**: Integrated customer wallet for payments with a loyalty points cashback reward system.
* **Payment Gateway**: Seamless checkouts powered by **Razorpay** API integration.

---

## 🛠️ Technology Stack

* **Backend**: Django 5.0+, Django REST Framework (DRF), Django Channels (ASGI)
* **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
* **Task Management**: Celery 5.3+, RabbitMQ (Message Broker)
* **Databases & Caches**:
  * **PostgreSQL** (Primary Relational Store)
  * **Redis** (Websocket Channel Layer, Celery Results Backend, Django Caching)
  * **MongoDB** (Structured Log Storage)
* **Web Server & Reverse Proxy**: Daphne (ASGI server), Gunicorn (WSGI server), Nginx
* **DevOps**: Docker, Docker Compose, GitHub Actions (CI)

---

## 📂 Project Structure

```
ecommerce/
├── config/              # Django core settings, routing, celery config
├── apps/
│   ├── users/           # Authentication, JWT, profiles, permissions
│   ├── products/        # Products, categories, reviews
│   ├── cart/            # Carts, wishlist items
│   ├── orders/          # Checkout, order management, status updates
│   ├── payments/        # Razorpay integration
│   ├── sellers/         # Multi-vendor profiles, GST records
│   ├── returns/         # Refund and returns workflow
│   ├── wallet/          # Wallet balance and loyalty transactions
│   ├── notifications/   # Email templates and async tasks
│   ├── analytics/       # Manager sales reports & database aggregations
│   ├── search/          # Search filters and Elasticsearch integration
│   └── chat/            # Websocket consumers and chat messages
├── nginx/               # Reverse proxy config for static files and ASGI routing
├── docker-compose.yml   # Multi-container local orchestration
├── Dockerfile           # Python application container config
├── .github/workflows/   # CI workflow (Django checks, tests)
├── .env.example         # Environment variables configuration template
└── index.html           # Main frontend portal entrypoint
```

---

## 🏁 Getting Started

### Prerequisites
Make sure you have [Docker](https://www.docker.com/) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Option A: Run via Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/USERNAME/REPO.git
   cd ecommerce
   ```
2. Copy the environment template to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
3. Boot the environment (this spins up PostgreSQL, Redis, MongoDB, RabbitMQ, Web Server, Nginx, and Celery):
   ```bash
   docker compose up --build
   ```
4. Access the application:
   * **Frontend Website**: `http://localhost/` (Nginx gateway)
   * **Django API Admin**: `http://localhost/admin/`
   * **RabbitMQ Dashboard**: `http://localhost:15672/` (Login: `guest` / `guest`)
   * **MongoDB logs**: Connect MongoDB Compass to `mongodb://localhost:27017`

---

### Option B: Run Locally (Standalone)

If you want to run the project locally without Docker containers (using local SQLite and memory caching):

1. **Activate Virtual Environment & Install Dependencies**:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate

   pip install -r requirements.txt
   ```
2. **Setup Local Environment File**:
   Copy `.env.example` to `.env` and set `MONGO_URL=mongodb://localhost:27017/ecommerce_logs` and `RABBITMQ_URL=amqp://guest:guest@localhost:5672//` (ensure local instances of MongoDB and RabbitMQ are running on your computer).
3. **Database Migration & Seeding**:
   ```bash
   python manage.py migrate
   python manage.py seed
   ```
4. **Start Django Backend Server**:
   ```bash
   python manage.py runserver
   ```
5. **Serve Frontend Website**:
   ```bash
   python -m http.server 8001
   ```
   Open **`http://localhost:8001/`** in your web browser.

---

## 🧪 Testing & CI

### Run Tests Locally
To run the automated test suite locally:
```bash
python manage.py test
```

### CI Pipeline
We use GitHub Actions to automate checks on every push or pull request to the `main` branch. The CI workflow installs dependencies, copies `.env.example`, validates Django settings compilation, and runs unit tests.

---

## 🔒 Security Best Practices

* **Ignored Files**: Database (`db.sqlite3`), dependencies cache (`.venv`), collected static files (`staticfiles/`), and credentials (`.env`) are explicitly ignored in `.gitignore`.
* **Environment Configuration**: Sensitive secrets (Django `SECRET_KEY`, database passwords, Razorpay key secret, SMTP passwords) should only be stored in your local `.env` file or hosting provider environment variables (Config Vars).
