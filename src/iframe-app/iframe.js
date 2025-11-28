// src/iframe-app/iframe.js
import '../assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import BookingWidget from '@/public-booking/BookingWidget.vue'
import iframeWidget from '@/iframe-app/IframeApp.vue'
import { createRouter, createWebHistory } from 'vue-router'
import BookingSuccessView from '@/public-booking/BookingSuccessView.vue'
import BookingFailureView from '@/public-booking/FailureView.vue'

const app = createApp(BookingWidget)
app.use(createPinia())

// --- DEDICATED PUBLIC APP ROUTER ---
const publicRouter = createRouter({
  // Use the same base path as the main SPA to capture the deep links
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // The main entry point for the widget (e.g. /booking-flow?session=...)
      path: '/booking-flow',
      name: 'booking-flow',
      component: iframeWidget, // Use the widget directly as the app entry
    },
    {
      // Payment success redirect target
      path: '/booking-flow/success',
      name: 'booking-success',
      component: BookingSuccessView,
    },
    {
      // Payment failure redirect target
      path: '/booking-flow/failure',
      name: 'booking-failure',
      component: BookingFailureView,
    },
    // Fallback: If a route is not found, send it to the base widget view
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'booking-flow' },
    },
  ],
})
// --- END DEDICATED PUBLIC APP ROUTER ---

app.use(publicRouter)

app.mount('#app')
