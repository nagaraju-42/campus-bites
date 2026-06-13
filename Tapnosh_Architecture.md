# Tapnosh (Campus Bites) - Architecture & System Design

## 1. Project Overview
**Tapnosh (Campus Bites)** is a real-time, multi-sided marketplace designed specifically for campus environments. It connects four distinct user groups into a single ecosystem:
1. **Students**: Browse menus, place orders, and track delivery in real-time.
2. **Shop Owners**: Manage menus, receive incoming orders on a Kitchen Display System (KDS), and prepare food.
3. **Riders**: Accept delivery batches, navigate to shops, and deliver food to hostel rooms.
4. **Super Admins**: Oversee the entire platform, manage payouts, resolve disputes, and configure platform fees.

---

## 2. Technology Stack
The application is built using a modern, scalable, and highly responsive architecture.

### Frontend
* **Framework**: Next.js 14 (App Router)
* **Library**: React 18
* **Styling**: Tailwind CSS (Utility-first CSS framework for custom, premium UI)
* **State Management**: Zustand (Lightweight global state for Carts, Authentication, and User roles)
* **PWA**: Next-PWA (Allows the app to be installed on mobile devices natively)

### Backend (Backend-as-a-Service)
* **Database**: Supabase (PostgreSQL)
* **Authentication**: Supabase Auth (Email/Password, Magic Links)
* **Real-time Engine**: Supabase Realtime (WebSockets for live order updates and chat)
* **Security**: Row Level Security (RLS) ensuring data is only visible to authorized parties.

### Cloud & Deployment
* **Hosting**: Vercel (Edge network, Serverless functions)
* **Push Notifications**: Web Push Protocol with VAPID keys for live device notifications.

---

## 3. Database Architecture
The PostgreSQL database revolves around highly relational data models secured by Row Level Security (RLS).

* **Profiles**: Extends the Supabase Auth system. Contains `role` (student, shop_owner, rider, admin) and contact info.
* **Shops**: Managed by shop owners. Contains configuration like `min_order_amount`.
* **Menu Items**: Linked to shops. Contains price, availability, and images.
* **Orders**: The central nervous system. Tracks total amount, status, delivery location, and OTPs.
* **Order Items**: Relational mapping of exactly what was ordered and its price at the time of order.
* **Financial Payouts**: Tracks earnings and platform fees owed to shops and riders.

---

## 4. Key System Workflows

### A. The Ordering Flow (Real-Time Cart Sync)
1. **Selection**: A student browses a shop and adds items to their global Zustand store.
2. **Live Syncing**: If an item goes out of stock in the database, the UI instantly warns the student and removes it to prevent failed checkouts.
3. **Checkout**: The student selects a pre-defined hostel location. The app calculates Platform Fees + Delivery Fees dynamically.
4. **Placement**: A database row is created in `orders`. Supabase Realtime broadcasts this new row.

### B. The Kitchen Display System (KDS) Flow
1. **Live Ping**: The Shop Owner’s tablet (listening via WebSockets) chimes immediately when the order is inserted.
2. **Acceptance**: The shop accepts the order, shifting the status from `pending` to `accepted`.
3. **Preparation**: Once cooking is done, the shop marks it `ready_for_pickup`.

### C. The Rider Flow (Smart Batching)
1. **Polling Area**: Riders view a pool of `ready_for_pickup` orders.
2. **Smart Sorting**: Orders are algorithmically grouped by **Hostel Block** in the UI, allowing riders to pick up multiple orders going to the same building.
3. **Delivery**: The rider uses a 4-digit OTP provided by the student to verify physical drop-off, securing the transaction.

---

## 5. Security & Authorization
The platform uses **Zero-Trust** security models.
* **Row Level Security (RLS)**: Even if a malicious user inspects network traffic, the database physically rejects queries. For example, a student can only `SELECT` orders where `student_id = auth.uid()`. 
* **Role-Based Access Control (RBAC)**: Next.js Middleware checks user roles before rendering pages, instantly redirecting unauthorized users (e.g., stopping a student from viewing the `/shop` dashboard).

---

## 6. Real-Time Interactions (WebSockets)
Tapnosh does not use standard REST API polling (which kills battery and bandwidth). Instead, it uses **Supabase Realtime WebSockets**:
* **Order Tracking**: When a shop clicks "Accept", the change is pushed to the student's phone instantly.
* **Live Chat**: Students and Riders communicate via a built-in messaging system using an `order_chats` table that broadcasts new messages directly to the screen.

---

## 7. Edge Cases Handled
* **Minimum Order Enforcement**: Enforced both on the client UI and the database.
* **Admin God Mode**: Super Admins can force-cancel orders, refund amounts, and view full audit trails of who changed what order status at what specific millisecond.
* **Caching**: Vercel caches shop menus for fast loading, while dynamic data (like carts) are fetched server-side to prevent stale states.

---
**Prepared For:** Tapnosh Project Presentation
