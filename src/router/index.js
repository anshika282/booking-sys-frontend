import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/booking-flow',
    name: 'booking-flow',
    component: () => import('@/iframe-app/IframeApp.vue'),
  },

  // --- Auth Routes ---
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
  { path: '/signup', name: 'signup', component: () => import('@/views/auth/SignUpView.vue') },

  // --- Main Admin Layout ---
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      // --- TOP-LEVEL ADMIN ROUTES ---
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
      },
      {
        path: 'services',
        name: 'admin-services',
        component: () => import('@/views/admin/ServicesView.vue'),
      },
      {
        path: 'services/create',
        name: 'admin-service-create',
        component: () => import('@/views/admin/services/CreateServiceView.vue'),
      },
      {
        path: 'bookings',
        name: 'admin-bookings',
        component: () => import('@/views/admin/BookingsView.vue'),
      },
      {
        path: 'customers',
        name: 'admin-customers',
        component: () => import('@/views/admin/CustomersView.vue'),
      },
      // --- NEW: Customer Details Route ---
      {
        path: 'customers/:id', // Use the customer ID as a URL parameter
        name: 'admin-customer-details',
        component: () => import('@/views/admin/customers/CustomerDetailsView.vue'),
        props: true, // Pass the ID as a prop
      },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: { template: '<div><h1>Analytics & Reports</h1></div>' },
      },
      {
        path: 'team',
        name: 'admin-team',
        component: () => import('@/views/admin/TeamView.vue'),
      },
      // The import path was incorrect. It is now fixed.
      {
        path: 'locations',
        name: 'admin-locations',
        component: () => import('@/views/admin/locations/LocationListView.vue'),
      },
      {
        path: 'payments',
        name: 'admin-payments',
        component: { template: '<div><h1>Payment Settings</h1></div>' },
      },

      // --- NESTED WIZARD ROUTES for a SPECIFIC service ---
      {
        path: 'services/:id',
        name: 'admin-service-edit', // Parent for the tabbed wizard
        component: () => import('@/views/admin/services/EditServiceView.vue'),
        props: true,
        redirect: (to) => ({ name: 'admin-service-edit-details', params: { id: to.params.id } }),
        children: [
          {
            path: 'details',
            name: 'admin-service-edit-details',
            component: () => import('@/components/forms/ServiceDetailsForm.vue'),
            props: (route) => ({ mode: 'edit', serviceId: route.params.id }),
          },
          {
            path: 'operating-hours',
            name: 'admin-service-operating-hours',
            component: () => import('@/views/admin/services/ServiceOperatingHours.vue'),
            props: true,
          },
          {
            path: 'ticket-tiers',
            name: 'admin-service-ticket-tiers',
            component: () => import('@/views/admin/services/ServiceTicketTiers.vue'),
            props: true,
          },
          {
            path: 'pricing-rules',
            name: 'admin-service-pricing-rules',
            component: () => import('@/views/admin/services/pricingRule/PricingRuleListView.vue'),
            props: true,
          },
          {
            path: 'pricing-rules/create',
            name: 'admin-service-pricing-rule-create',
            component: () => import('@/views/admin/services/pricingRule/CreatePricingRuleView.vue'),
            props: true,
          },
          {
            path: 'pricing-rules/:ruleId/edit',
            name: 'admin-service-pricing-rule-edit',
            // This will likely re-use your CreatePricingRuleView or a new Edit view
            component: () => import('@/views/admin/services/pricingRule/EditPricingRuleView.vue'), // Assuming you reuse the create view for edit
            props: true, // This will pass both `id` and `ruleId` as props
          },
          {
            path: 'coupons',
            name: 'admin-service-coupons',
            component: () => import('@/views/admin/services/coupons/CouponListView.vue'),
            props: true,
          },
          {
            path: 'coupons/create',
            name: 'admin-service-coupon-create',
            component: () => import('@/views/admin/services/coupons/CreateCouponView.vue'),
            props: true,
          },
          {
            path: 'coupons/:couponId/edit',
            name: 'admin-service-coupon-edit',
            component: () => import('@/views/admin/services/coupons/EditCouponView.vue'),
            props: true,
          },
          {
            path: 'add-ons',
            name: 'admin-service-add-ons',
            component: () => import('@/views/admin/services/ServiceAddOnsView.vue'),
            props: true,
          },
        ],
      },
    ],
  },

  // --- Fallback Route ---
  {
    path: '/set-password/:token',
    name: 'set-password',
    component: () => import('@/views/auth/SetPasswordView.vue'),
    props: true, // This will pass the ':token' as a prop to the component
  },
  { path: '/:pathMatch(.*)*', redirect: '/admin/dashboard' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (authStore.isInitiallyLoading) {
    await authStore.attemptLoginFromToken()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if ((to.name === 'login' || to.name === 'signup') && authStore.isAuthenticated) {
    next({ name: 'admin-dashboard' })
  } else {
    next()
  }
})

export default router
