<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  LineChart,
  CircleUser,
  Menu,
  CreditCard,
  Building,
  Rocket, // A nice icon for the App name
  MapPin,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Toaster } from '@/components/ui/toast'

const navItems = [
  { name: 'Dashboard', to: { name: 'admin-dashboard' }, icon: Home },
  { name: 'Services', to: { name: 'admin-services' }, icon: Package },
  { name: 'Bookings', to: { name: 'admin-bookings' }, icon: ShoppingCart },
  { name: 'Customers', to: { name: 'admin-customers' }, icon: Users },
  { name: 'Analytics', to: { name: 'admin-analytics' }, icon: LineChart },
  { name: 'Locations', to: { name: 'admin-locations' }, icon: MapPin },
  { name: 'Team', to: { name: 'admin-team' }, icon: CircleUser },
  { name: 'Payment Settings', to: { name: 'admin-payments' }, icon: CreditCard, ownerOnly: true },
]

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'login' })
}
// --- EXPLANATION 1: Role-Based Access Control (RBAC) ---
// This computed property checks the authenticated user's role.
const isOwner = computed(() => {
  return authStore.user?.role === 'owner'
})
</script>

<template>
  <div class="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
    <!-- SIDEBAR (Desktop) -->
    <div class="hidden border-r bg-sky-50 md:block">
      <div class="flex h-full max-h-screen flex-col gap-2">
        <!-- --- UPDATED: Application Header --- -->
        <div class="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <RouterLink to="/admin/dashboard" class="flex items-center gap-2 font-semibold">
            <Rocket class="h-6 w-6 text-primary" />
            <!-- Your App Logo -->
            <span class="font-bold">Booking System</span>
            <!-- Your App Name -->
          </RouterLink>
        </div>
        <div class="flex-1 overflow-auto py-2">
          <nav class="grid items-start px-2 text-sm font-medium lg:px-4">
            <!-- --- NEW: Tenant Name as Nav Header --- -->
            <div class="mb-4 px-3 py-2">
              <h2 v-if="authStore.user" class="text-lg font-bold text-primary">
                {{ authStore.user?.tenant?.name }}
              </h2>
              <h2 v-else class="text-lg font-bold text-primary">Loading...</h2>
            </div>

            <!-- Standard Navigation Links -->
            <RouterLink
              v-for="item in navItems"
              :key="item.name"
              :to="item.to"
              v-slot="{ href, navigate, isActive }"
              custom
            >
              <a
                v-if="!item.ownerOnly || isOwner"
                :href="href"
                @click="navigate"
                :class="isActive ? 'bg-background text-primary' : 'text-muted-foreground'"
                class="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary"
              >
                <component :is="item.icon" class="h-4 w-4" />
                {{ item.name }}
              </a>
            </RouterLink>
          </nav>
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <!-- HEADER (Top Bar) -->
      <header class="flex h-14 items-center gap-4 border-b bg-sky-50 px-4 lg:h-[60px] lg:px-6">
        <!-- Mobile Sidebar Toggle -->
        <Sheet>
          <SheetTrigger as-child>
            <Button variant="outline" size="icon" class="shrink-0 md:hidden">
              <Menu class="h-5 w-5" />
              <span class="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="flex flex-col bg-muted">
            <SheetHeader class="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription> Main navigation links for the admin dashboard. </SheetDescription>
            </SheetHeader>
            <nav class="grid gap-2 text-lg font-medium">
              <!-- --- UPDATED: Mobile App Header --- -->
              <RouterLink
                to="/admin/dashboard"
                class="flex items-center gap-2 text-lg font-semibold mb-4 border-b pb-4"
              >
                <Rocket class="h-6 w-6 text-primary" />
                <span>Booking System</span>
              </RouterLink>

              <!-- --- NEW: Mobile Tenant Name --- -->
              <div class="mb-4 px-3">
                <h2 v-if="authStore.user" class="text-xl font-bold text-primary">
                  {{ authStore.user?.tenant?.name }}
                </h2>
                <h2 v-else class="text-xl font-bold text-primary">Loading...</h2>
              </div>

              <!-- Mobile Navigation Links -->
              <RouterLink
                v-for="item in navItems"
                :key="item.name"
                :to="item.to"
                class="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                <a
                  v-if="!item.ownerOnly || isOwner"
                  :href="href"
                  @click="navigate"
                  class="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <component :is="item.icon" class="h-5 w-5" />
                  {{ item.name }}
                </a>
              </RouterLink>
            </nav>
          </SheetContent>
        </Sheet>

        <div class="w-full flex-1">
          <h1 v-if="authStore.user" class="text-lg font-semibold text-muted-foreground">
            Welcome, {{ authStore.user.name }}
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="secondary" size="icon" class="rounded-full">
              <CircleUser class="h-5 w-5" />
              <span class="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <!-- Added Conditional link in dropdown for Owner -->
            <RouterLink v-if="isOwner" :to="{ name: 'admin-payments' }">
              <DropdownMenuItem>Payment Settings</DropdownMenuItem>
            </RouterLink>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
  <Toaster position="top-right" />
</template>
