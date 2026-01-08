# Core Architecture & Logic Manual: Booking System Frontend

This document explains the structural design and the underlying logic of the Booking System. As a developer, you must understand that this is not a static website; it is a **dynamic, schema-driven engine** built to handle multiple industries (Adventure Parks, Appointments, Events) within a single codebase.

---

## 1. The "Big Picture" Logic
The system revolves around three core pillars:
1.  **Multi-Tenancy (Isolation):** Every request is isolated by a `tenant_id`. The frontend doesn't "know" which business it belongs to until it reads the domain or configuration.
2.  **The "Booking Intent" (Stateful Cart):** Unlike a simple form, booking is treated as a **transaction in progress**. The logic ensures that if a user closes their browser, their selected tickets and slots are reserved for a 30-minute window.
3.  **Schema-Driven UI:** The UI does not hardcode "Doctor" or "Zipline." Instead, it asks the backend for the `service_type` and dynamically renders the appropriate selection components.

---

## 2. Technical Stack
*   **Vue 3 (Composition API):** Utilizing `<script setup>` for clean, logic-heavy components.
*   **Pinia:** The central nervous system. It manages global state (Auth, Intents, UI).
*   **Vue Router:** Manages the lifecycle between the "Discovery" phase and the "Checkout" phase.
*   **Axios + Interceptors:** A customized network layer that automatically attaches Tenant IDs and JWT tokens to every outgoing request.
*   **Laravel Echo:** Listens for WebSocket events (e.g., "This slot was just taken by someone else").

---

## 3. Detailed Architecture Breakdown

### A. The Multi-Tenant Network Layer
**Logic:** Every API call must be routed to the correct client database.
*   **The Interceptor:** Inside `src/services/api.js` (or similar), an Axios interceptor is configured.
*   **Workflow:**
    1.  The app identifies the `tenant_id` (via URL or account settings).
    2.  The interceptor injects `X-Tenant-ID` into the HTTP headers.
    3.  The backend uses this header to switch database connections on the fly.
    4.  If a `401 Unauthorized` is returned, the logic automatically redirects to the login page.

### B. The "Booking Intent" Lifecycle (The Core Logic)
This is the most critical part of the application. It follows a **State Machine** pattern.

1.  **Creation:** When a user clicks "Book Now," the frontend calls `POST /booking-intents`. This generates a `session_id`.
2.  **Step-by-Step Progression:** As the user moves through steps (Select Tickets -> Select Date -> Add-ons), the frontend performs a `PUT` request to update the `intent_data` (a JSON blob in the DB).
3.  **Real-Time Locking:** While the intent is "Active," the frontend communicates via WebSockets to "Hold" the selected availability slot so no one else can book it.
4.  **Completion:** Only when the `POST /bookings/confirm` is called does the "Intent" convert into a permanent "Booking" record.

### C. State Management Strategy (Pinia)
The app is split into three primary stores:

*   **`useAuthStore`:** Manages JWT tokens and permissions. It determines if a user sees the **Customer View** or the **Admin Dashboard**.
*   **`useBookingStore`:** The "Heavy Lifter." It stores the current session's state, calculates the `total_price` locally (before verifying with the backend), and manages the expiration timer.
*   **`useServiceStore`:** Caches service details, categories, and availability slots to prevent redundant API calls during navigation.

---

## 4. Component Hierarchy & Logic

The project follows an **Atomic Design**-inspired structure:

### 1. Base Components (`/components/ui`)
*   **Logic:** These are "Dumb" components (Buttons, Inputs, Modals). They do not know about the API. They only receive props and emit events.
*   **Framework:** Built using Tailwind CSS and Radix Vue.

### 2. Industry-Specific Modules (`/components/booking`)
The system uses **Dynamic Component Injection**. Inside the main booking view:
*   If `service_type === 'ticketed'`, it imports the `TicketSelector.vue`.
*   If `service_type === 'appointment'`, it imports the `ProviderCalendar.vue`.
*   **Logic:** This allows the app to be "industry-agnostic." You can add a new industry (e.g., "Hotels") just by creating a new component module without breaking existing ones.

### 3. Layouts (`/layouts`)
*   **AppLayout:** The standard customer view with a navigation bar and footer.
*   **AdminLayout:** A sidebar-heavy layout for managers to see analytics and manage slots.

---

## 5. Real-Time Communication Architecture
The frontend is reactive to other users' actions.
*   **Channel:** `private-tenant.{tenantId}`
*   **Listener:** Using `Echo.private()`, the app listens for `SlotAvailabilityChanged`.
*   **Frontend Action:** If an admin closes a slot while a user is looking at it, the UI immediately grays out that slot and shows a "No longer available" toast notification without a page refresh.

---

## 6. Directory Structure (Visual Map)
```text
src/
├── api/              # Axios instance and API endpoint definitions
├── assets/           # Global styles and images
├── components/
│   ├── ui/           # Reusable UI primitives (Shadcn)
│   ├── booking/      # Dynamic logic for different booking types
│   └── shared/       # Navbar, Footer, Notifications
├── layouts/          # Wrapper components for Auth/Admin/Guest
├── stores/           # Pinia (State Management)
├── views/            # Route-level pages (Home, Checkout, Admin)
├── router/           # Navigation guards and route definitions
└── utils/            # Formatters (currency, date) and validation logic
```

---

## 7. How to Extend This Project
If you are the new developer:
1.  **To add a new API:** Add the endpoint to `api/` and a corresponding method in the relevant `store/`.
2.  **To change a Step in the Flow:** Modify the `BookingView.vue` logic which controls the `currentStep` state.
3.  **To adjust Styling:** Most global variables are in `tailwind.config.js`.

---
