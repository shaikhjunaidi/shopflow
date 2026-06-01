<div align="center">
  <img src="frontend/public/favicon.svg" width="120" height="120" alt="ShopFlow Logo" />
  <h1>ShopFlow</h1>
  <p><strong>Next-Generation Point of Sale & Inventory Management System</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>
</div>

<br />

## ✨ Overview

ShopFlow is an ultra-modern, fully responsive Point of Sale (POS) and inventory management platform designed for modern retailers. With an elegant glassmorphism UI, a lightning-fast checkout system, and a beautiful public storefront, ShopFlow empowers businesses to manage their stock, process sales, and serve customers anywhere, anytime.

---

## 🚀 Live Demo

**Frontend (Store & Dashboard):** [https://shopflow-frontend.onrender.com](https://shopflow-frontend.onrender.com)  
**Backend API:** [https://shopflow-backend-j1mm.onrender.com](https://shopflow-backend-j1mm.onrender.com)  

> **Default Admin Account:**
> - Email: `junnuedits@gmail.com`
> - Password: `junnubhai@07`

---

## 💎 Key Features

- **Beautiful Public Storefront:** Customers can browse your catalog, search for products, and reserve items for lightning-fast in-store pickup.
- **Advanced POS Terminal:** Cashiers can scan barcodes, search products, add discounts, calculate taxes, and generate invoices instantly.
- **Smart Inventory Management:** Low stock alerts, automated stock deductions upon sale, and detailed inventory history logs.
- **Dynamic Role-Based Access:** Distinct capabilities for Admin, Manager, and Cashier roles to keep your system secure.
- **Persistent Media Storage:** Seamless integration of base64-encoded images to bypass ephemeral file storage limitations on free cloud hosts.
- **Modern UI/UX:** Responsive layouts built with Tailwind CSS featuring smooth micro-animations, glassmorphism panels, and an intuitive Dark Mode.

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS + Lucide React (Icons)
- **Routing:** React Router v6
- **State Management & Fetching:** Axios, Context API

### Backend
- **Framework:** Node.js / Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens) & bcrypt
- **Image Processing:** Multer (Base64 Memory Storage)

---

## 🛠️ Local Development

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally

### 2. Clone the repository
```bash
git clone https://github.com/shaikhjunaidi/shopflow.git
cd shopflow
```

### 3. Backend Setup
```bash
cd backend
npm install

# Create a .env file with your local database URL
echo "DATABASE_URL=postgresql://user:password@localhost:5432/shopflow" > .env

# Push the database schema
npx prisma db push

# Start the development server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start the Vite development server
npm run dev
```

The frontend will run on `http://localhost:5173` and automatically connect to your local backend on `http://localhost:5000`.

---

## ☁️ Deployment (Render)

ShopFlow is fully pre-configured to be deployed on Render using the Blueprint standard (`render.yaml`).

1. Fork this repository.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New** -> **Blueprint**.
4. Connect the repository.
5. Render will automatically provision:
   - A PostgreSQL Database
   - A Node.js Backend API
   - A Static React Frontend
6. The frontend automatically detects the injected `VITE_API_HOST` and formats it securely for public internet routing.

---

## 👨‍💻 Author

Built with ❤️ for modern businesses.
