// src/iframe-app/iframe.js
import '../assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import BookingWidget from '@/public-booking/BookingWidget.vue'

const app = createApp(BookingWidget)
app.use(createPinia())
app.mount('#app')
