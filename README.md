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

# API Architecture & Communication Manual

This document provides a technical deep-dive into the API integration. As a developer, you will spend most of your time adding or modifying these connections to bring data into the UI.

---

## 1. API Structure & Hierarchy
The application uses a **layered communication pattern** to ensure code reusability and clean separation of concerns.

### The Hierarchy:
1.  **Axios Instance (`src/api/axios.js`):** The base configuration. It sets the `baseURL`, `timeout`, and headers. This is where the **Interceptors** live.
2.  **API Services (`src/services/*.js`):** These are modular files (e.g., `bookingService.js`, `authService.js`). They contain the raw Axios calls. They do **not** manage state; they only return promises.
3.  **Pinia Stores (`src/stores/*.js`):** Stores call the Services. They handle the "Loading" states and save the returned data into global variables for the UI to use.
4.  **Vue Components:** Components simply "watch" the Store. They never call the API directly.

---

## 2. Current API Mapping Table
This table maps the backend endpoints to their specific UI counterparts and the files you need to edit.

| API Endpoint (`/api/v1/`) | UI Feature | Vue Component/View File | Service File |
| :--- | :--- | :--- | :--- |
| `POST /auth/login` | User Authentication | `views/auth/LoginView.vue` | `authService.js` |
| `GET /services` | Service Catalog (Home) | `views/HomeView.vue` | `serviceService.js` |
| `GET /services/{id}` | Service Details Page | `views/booking/ServiceView.vue` | `serviceService.js` |
| `GET /services/{id}/availability` | Date/Time Selection | `components/booking/SlotPicker.vue` | `serviceService.js` |
| `POST /booking-intents` | Initializing "Cart" | `views/booking/BookingFlow.vue` | `bookingService.js` |
| `PUT /booking-intents/{id}` | Progressing Steps | `views/booking/BookingFlow.vue` | `bookingService.js` |
| `POST /bookings/confirm` | Payment/Finalization | `views/booking/SuccessView.vue` | `bookingService.js` |
| `GET /analytics/dashboard` | Admin Stats | `views/admin/Dashboard.vue` | `adminService.js` |

---

## 3. How to Add a New API (Step-by-Step)
If you need to fetch a new piece of data, follow this strict order:

1.  **Define the Service:** Add a function in the relevant file in `src/services/`.
    ```javascript
    // Example in src/services/userService.js
    export const getUserProfile = () => api.get('/user/profile');
    ```
2.  **Update the Store:** Create an action in the Pinia store to handle this service.
    ```javascript
    // src/stores/user.js
    actions: {
      async fetchProfile() {
        this.loading = true;
        this.profile = await getUserProfile();
        this.loading = false;
      }
    }
    ```
3.  **Use in Component:**
    ```javascript
    const userStore = useUserStore();
    onMounted(() => userStore.fetchProfile());
    ```

---

## 4. Session Management & Auth Lifecycle

### A. The "Original Login" Redirect
The system uses a **JWT (JSON Web Token)** stored in `localStorage` or `cookies`. 
*   **Default Behavior:** If a user tries to access `/admin` without a token, the `router/index.js` guard catches them and pushes them to `/login`.
*   **Fallback Logic:** If an API returns a `401 Unauthorized` (meaning the session expired), a **Global Interceptor** triggers.

### B. Global Interceptor Logic (The "Kick-out" Mechanism)
Located in `src/api/axios.js`, this logic ensures users don't see "broken" data when their session dies:
1.  **Response Interceptor:** Watches every incoming response.
2.  **Trigger:** If `error.response.status === 401`.
3.  **Action:** 
    *   Calls `authStore.logout()`.
    *   Clears local storage.
    *   Redirects to the login page with a query param: `/login?redirect=current-page`.
    *   Shows a "Session Expired" toast notification.

---

## 5. Fallback & Error Handling
To prevent the app from crashing, the API layer has three levels of fallbacks:

1.  **Network Fallback:** If the backend is down, the Axios interceptor catches the `Network Error` and displays a "Server Unreachable" message.
2.  **Data Fallback:** If an API returns an empty set (e.g., no services available), the UI uses a "Empty State" component (e.g., `NoServicesFound.vue`) instead of just a white screen.
3.  **Route Fallback (404):** Any URL that doesn't match a defined API endpoint or UI route is automatically caught by a `catch-all` route that displays the **404 Not Found** page.

---

### Important Developer Note:
> **Never** hardcode the API URL in components. Always use the `VITE_API_BASE_URL` environment variable. This ensures that when you move from development to production, the frontend automatically knows where the new server is.

---

# Complete View File Directory & Logic Mapping

This section maps the physical files in `src/views/` to their actual functionality.

## 1. Public / Customer-Facing Views
These pages are accessible to the end-users (customers) making bookings.

| View File | Purpose | Components Used | Pinia Store |
| :--- | :--- | :--- | :--- |
| `HomeView.vue` | **Service Discovery:** Landing page to browse services. | `ServiceCard.vue`, `CategoryFilter.vue`, `HeroSection.vue` | `useServiceStore` |
| `booking/BookingFlow.vue` | **Step-by-Step Engine:** The main multi-step booking controller. | `StepProgress.vue`, `TicketSelector.vue`, `SlotPicker.vue`, `AddonSelector.vue` | `useBookingStore`, `useIntentStore` |
| `booking/ResumeView.vue` | **Session Recovery:** Restores a booking from a link. | `LoadingSpinner.vue` | `useIntentStore` |
| `booking/SuccessView.vue` | **Confirmation:** Shows the final QR code and booking ref. | `QRCodeGenerator.vue`, `Confetti.vue`, `ReceiptDetails.vue` | `useBookingStore` |

### 🧠 Logic Deep-Dive: `BookingFlow.vue`
This is a **State-Machine View**. 
*   **The "Step" Logic:** It maintains a `currentStep` integer. It uses a `switch` statement or a computed component to render the correct UI for the current step (e.g., Step 1: Tickets, Step 2: Date/Time).
*   **The "Guard" Logic:** You cannot skip to Step 3 if Step 2 data is missing. The logic validates the `intentStore.data` before allowing the "Next" button to function.
*   **The "Sync" Logic:** Every time a user completes a step, the view calls `intentStore.updateRemote()`, which syncs the progress to the database via `PUT /booking-intents/{id}`.

---

## 2. Administrative Views (`/admin`)
These pages are protected by the `AuthGuard` and are only for Tenant staff.

| View File | Purpose | Components Used | Pinia Store |
| :--- | :--- | :--- | :--- |
| `admin/Dashboard.vue` | **Real-time Stats:** Overview of revenue and traffic. | `RevenueChart.vue`, `StatCard.vue`, `ActiveIntentsList.vue` | `useAdminStore` |
| `admin/services/ServiceList.vue` | **Catalog Management:** Table view of all services. | `DataTable.vue`, `StatusToggle.vue`, `ActionButtons.vue` | `useServiceStore` |
| `admin/services/ServiceEditor.vue` | **The "God Form":** Complex CRUD for services. | `ServiceForm.vue`, `TierTable.vue`, `OperatingHoursGrid.vue` | `useServiceStore` |
| `admin/bookings/BookingList.vue` | **Transaction Log:** Filterable list of all orders. | `FilterBar.vue`, `BookingExportButton.vue`, `StatusBadge.vue` | `useBookingStore` |
| `admin/customers/CustomerList.vue` | **CRM:** List of all customers and their history. | `CustomerProfileModal.vue`, `SearchInput.vue` | `useCustomerStore` |
| `admin/settings/SettingsView.vue` | **Tenant Profile:** Configuration for billing & domain. | `DomainConfig.vue`, `BillingForm.vue`, `AvatarUpload.vue` | `useTenantStore` |

### 🧠 Logic Deep-Dive: `ServiceEditor.vue` (Add/Edit)
*   **The "Mode" Logic:** It checks the route. If an `:id` exists, it enters **Edit Mode** and fetches existing data. If not, it stays in **Create Mode**.
*   **The "Polymorphic" Logic:** This view dynamically changes the `ServiceForm` fields.
    *   *Logic:* It watches the `service_type` dropdown. If it changes from `appointment` to `ticketed`, it wipes the "Provider" fields and shows the "Venue" fields.
*   **The "Deep Save" Logic:** When saving, it doesn't just send one request. It sends the core service data, and then maps through the `ticket_tiers` and `pricing_rules` arrays to send sub-resource updates.

---

## 3. Authentication & System Views
These handle the "Gatekeeping" and error states of the application.

| View File | Purpose | Components Used | Pinia Store |
| :--- | :--- | :--- | :--- |
| `auth/LoginView.vue` | **Gateway:** Login for staff/owners. | `LoginForm.vue`, `TenantLogo.vue` | `useAuthStore` |
| `auth/RegisterView.vue` | **Onboarding:** For new tenants to sign up. | `OnboardingWizard.vue` | `useAuthStore` |
| `errors/NotFound.vue` | **404 Page:** Fallback for invalid URLs. | `LottieAnimation.vue`, `HomeLink.vue` | N/A |
| `errors/Unauthorized.vue` | **403 Page:** For users trying to access forbidden admin areas. | `LockIcon.vue` | `useAuthStore` |

### 🧠 Logic Deep-Dive: `LoginView.vue`
*   **The "Redirect" Logic:** It checks if a `redirect` query exists in the URL (e.g., `/login?redirect=/admin/services`). After a successful login, it pushes the user to that specific page rather than just the dashboard.
*   **The "Tenant Context" Logic:** When a staff member logs in, the store immediately fetches the `tenant_settings` to set the global theme (colors, logos) before the dashboard renders.

---

## 4. Key Logic Used Across All Pages

### A. The "Dirty State" Check
In `ServiceEditor.vue` and `SettingsView.vue`, a `isDirty` computed property is used.
*   **Logic:** It compares a JSON string of the `originalData` with a JSON string of the `formData`. 
*   **Result:** It prevents the user from accidentally navigating away or refreshing if they have unsaved changes by using the `onBeforeRouteLeave` Vue Router hook.

### B. Skeleton Loading Logic
Almost every page (Service List, Dashboard, Booking Flow) uses **Skeletons** instead of a single loading spinner.
*   **Logic:** While `store.loading` is true, the UI renders a "Ghost" version of the components using CSS animations to provide a perceived performance boost.

### C. Server-Side Pagination Logic
In `BookingList.vue` and `CustomerList.vue`:
*   **Logic:** The UI doesn't fetch 1,000 bookings. It sends `?page=1&limit=10`. 
*   **Interaction:** When the user clicks "Next," the view updates the URL query params, which triggers a `watch()` function to re-fetch the data from the API.

---

### Summary Checklist for a New Developer:
1.  **To change the Homepage:** Look at `HomeView.vue`.
2.  **To fix a bug in the Booking steps:** Look at `booking/BookingFlow.vue`.
3.  **To add a field to the Service Form:** Edit `admin/services/ServiceEditor.vue` and its child component `ServiceForm.vue`.
4.  **To change the redirect logic after login:** Edit `auth/LoginView.vue`.

---

# 🚀 Advanced Logic: Real-Time Features & Permissions

## 1. Real-Time Coupon Tracking (The "Pusher" Logic)
This feature allows Admin staff to see live "Financial Activity" in the dashboard. When a customer applies a coupon in the **BigQ Booking Widget**, the admin panel updates instantly without a refresh.

### The Logic Flow:
1.  **Trigger (The Widget):** The customer enters a code in `AddCoupon.vue`. The frontend calls `PUT /booking-intents/{id}/coupons`.
2.  **Broadcasting (The Backend):** Upon successful validation, the backend fires a `CouponApplied` event to **Pusher/WebSockets**.
3.  **Reception (Admin Dashboard):** The Admin's browser is listening on a private tenant channel.

### How to Build/Implement the Frontend Listener:
In your `Dashboard.vue` or a dedicated `ActivityStore.js`, you implement the following logic:

```javascript
// Logic for real-time coupon tracking
Echo.private(`tenant.${tenantId}`)
    .listen('CouponApplied', (e) => {
        // 1. Update the 'Live Activity' feed
        activityStore.pushNotification({
            message: `Coupon "${e.coupon_code}" applied to a new intent!`,
            type: 'success'
        });
        
        // 2. Refresh the 'Estimated Revenue' if the coupon changes the total
        adminStore.updateLiveStats(e.new_total);
    });
```
*   **Key Benefit:** Admins can see marketing campaigns working in real-time. If a "FLASH20" code is being used 50 times in a minute, the admin knows the campaign is successful.

---

## 2. Dashboard: Service Intelligence & Visibility
The Dashboard doesn't just list services; it provides **Service Intelligence**. This helps the tenant understand which parts of their business are performing.

### Service Metrics Logic:
The Dashboard fetches data from `GET /analytics/services`. The UI then processes this into three views:
*   **The Popularity Logic:** Sorts services by `bookings_count`. This is shown in a "Top Performing Services" widget.
*   **The Capacity Logic:** Calculates `(booked_slots / total_slots) * 100`. If a service is at 90% capacity, the dashboard highlights it in **Red**, signaling the admin to open more slots.
*   **The Revenue Logic:** Shows which specific service type (e.g., "Zipline" vs "Guided Tour") is generating the most cash flow.

---

## 3. Role-Based Access Control (RBAC)
The system differentiates between **Owners**, **Admins**, and **Staff**. This is enforced using "Gatekeeper Logic" in both the UI and the Router.

### Role Definitions:
| Role | Level | Access Logic |
| :--- | :--- | :--- |
| **Owner** | God Mode | Access to Billing, Tenant Settings, Deleting Services, Managing Staff, Full Analytics. |
| **Admin** | Management | Access to Editing Services, Managing Bookings, Viewing Analytics, Issuing Refunds. |
| **Staff** | Operational | Access to Booking List, Customer Check-in (QR Scanning), viewing Availability. *Cannot* see revenue or edit services. |

### How the Logic is Enforced:

#### A. The UI Directive Logic (Hiding Buttons)
We use a custom helper (or a `v-if`) to check permissions before rendering a button.
```vue
<!-- Only Owners can see the Delete button -->
<button v-if="authStore.hasRole('owner')" @click="deleteService">
  Delete Service
</button>

<!-- Staff can only see the 'Check-in' button -->
<button v-if="authStore.hasRole('staff')" @click="checkIn">
  Scan QR Code
</button>
```

#### B. The Router Guard Logic (Protecting Pages)
If a "Staff" member tries to manually type `/admin/settings/billing` into the URL bar, the **Navigation Guard** in `router/index.js` blocks them:
```javascript
router.beforeEach((to, from, next) => {
  const userRole = authStore.role;
  
  // If page requires 'owner' and user is 'staff', redirect to dashboard
  if (to.meta.requiresOwner && userRole !== 'owner') {
    next({ name: 'AdminDashboard', query: { error: 'unauthorized' } });
  } else {
    next();
  }
});
```

---

## 4. Feature Logic Still To Be Built (Roadmap)
For the next developer, these are the logic "Gaps" mentioned:

1.  **Pusher Activity Feed:** A sidebar in the Admin Panel that shows a scrolling list of real-time events (e.g., "User X just selected a slot," "User Y applied a coupon").
2.  **The "Booking Widget" Session Sync:** Logic to ensure that if a user starts a booking in the widget on a mobile phone and moves to a desktop, the "Booking Intent" is synced via their email or phone number.
3.  **Owner-Only Financial Reports:** Building the logic for CSV/PDF exports of tax-ready financial data, which is strictly restricted to the `owner` role.

---

### Summary Checklist for New Developer:
*   **Real-time:** Check `Echo` listeners for events related to coupons and slot locks.
*   **Services:** Ensure the dashboard filters services based on their `status` (don't show 'archived' services in the main analytics).
*   **Security:** Always check `authStore.role` before performing any "Destructive" action (Delete/Edit).

---

# Booking Widget: Front-End Core & SDK Documentation

This section of the documentation is dedicated to the **BigQ Booking Widget**—the customer-facing interface designed to be embedded into external CRMs or websites. 

> **Note to Developers:** The Widget is architecturally distinct from the Admin Dashboard. It is built as a lightweight, high-performance "Wizard" designed for speed and state persistency.

---

## 1. Architectural Philosophy
The Widget operates as a **Stateful Micro-App**. 
*   **Decoupled UI:** While the Dashboard uses a sidebar/complex-navigation layout, the Widget uses a **linear flow** (Step 1 → Step 2 → Step 3).
*   **Session-First:** It relies heavily on a "Booking Intent" session to ensure that users never lose their progress, even if they accidentally close the browser or the host CRM page refreshes.

---

## 2. Session Management (The "Heart" of the Widget)
Unlike the Admin panel which uses standard JWT auth, the Widget uses a **Session-Based Identity** system via the `booking_intents` table.

### How it works:
1.  **Initial Load:** When the widget loads, it checks `localStorage` for a `booking_session_id`.
2.  **New Session:** If no ID is found, it calls `POST /api/v1/booking-intents` to create a "Shopping Cart" in the database.
3.  **Persistence:** The returned `session_id` is stored locally. Every subsequent action (selecting a ticket, picking a time) is a `PUT` request to that specific ID.
4.  **Resumption Logic:** If a user returns after an hour, the Widget calls `GET /api/v1/booking-intents/{id}/resume`. This "Hydrates" the UI, automatically jumping the user back to the exact step where they left off.

---

## 3. SDK Integration & Usage
The Widget utilizes two primary SDKs to handle data and real-time reactivity.

### A. Axios (The Data SDK)
Used for all "Transactional" movements. 
*   **Custom Wrapper:** Found in `src/api/widget-api.js`. 
*   **Logic:** It automatically injects the `X-Booking-Session` header into every request. This ensures the backend knows exactly which "Cart" is being modified without requiring a user to log in.

### B. Laravel Echo / Pusher (The Real-Time SDK)
This is used for **Optimistic Locking** and **Live Pricing**.
*   **Channel:** `private-intent.{sessionId}`
*   **Implementation Logic:**
    ```javascript
    // Subscribing to intent-specific updates
    Echo.private(`intent.${sessionId}`)
        .listen('PriceUpdated', (e) => {
            // Update the 'Total Amount' in the widget footer immediately
            widgetStore.total = e.newTotal;
        })
        .listen('SlotLocked', (e) => {
            // If the user takes too long, and a slot expires, notify them
            toast.error("Your selected time slot has expired and been released.");
            widgetStore.resetToStep('availability');
        });
    ```

---

## 4. The UI Flow Logic
The Widget UI is driven by a `currentStep` controller. The files are located in `src/components/widget/`.

| Step | View/Component | Logic Performed |
| :--- | :--- | :--- |
| **01: Discovery** | `ServiceSelector.vue` | Fetches services based on the `tenant_id` passed via the Widget URL. |
| **02: Configuration**| `TierSelector.vue` | Handles ticket quantities. Updates the `intent_data` JSON. |
| **03: Availability** | `WidgetCalendar.vue` | Displays slots. Triggers the "Lock" logic on the backend to hold the spot. |
| **04: Details** | `CustomerForm.vue` | Collects name, email, and phone. Maps to the `customers` table. |
| **05: Checkout** | `PaymentGateway.vue` | Handles the final confirmation and triggers the "Booking Conversion." |

---

## 5. Guide for New Developers: Making Changes

### How to add a new step:
1.  **Modify the Store:** Add a new state in `useWidgetStore.js` to track the data for that step.
2.  **Create the Component:** Build the `.vue` file in `src/components/widget/steps/`.
3.  **Update the Controller:** In `WidgetMain.vue`, add your new component to the `v-if / v-else` or dynamic component list.
4.  **Sync with API:** Ensure that when the user clicks "Next," you call the `updateIntent()` method to save that step's data to the backend.

### How to change the Theme/Styling:
The Widget uses **CSS Variables** for easy white-labeling. 
*   **Logic:** The Widget fetches `tenant_settings` on load.
*   **Action:** You can override styles globally by modifying the `:root` variables in `src/assets/widget.css`. 
    *   Example: `--widget-primary-color: tenantData.brand_color;`

---

## 6. Widget Communication (Iframe Logic)
If you are embedding this widget into a CRM, it uses **Window PostMessage API** to talk to the parent site.
*   **Logic:** When a booking is confirmed, the widget sends a message:
    ```javascript
    window.parent.postMessage({
        event: 'booking_completed',
        data: { reference: 'BK-12345', email: 'user@example.com' }
    }, '*');
    ```
*   **Developer Action:** The host CRM can listen for this message to automatically close the widget or refresh the CRM's internal lead list.

---

### Summary Checklist for Customization:
*   **State:** Check `useWidgetStore.js` for the current flow state.
*   **API:** All widget-specific calls are in `src/services/widgetService.js`.
*   **Real-time:** Ensure Pusher credentials are set in `.env` for slot locking to work.
*   **UI:** The widget is responsive by default—ensure any new components use Tailwind's `sm:` and `md:` utilities to maintain mobile compatibility.
