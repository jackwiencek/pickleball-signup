<script setup lang="ts">
import { useUserSession, useRouter, useRoute } from '#imports'
import { $fetch } from 'ofetch'

const router = useRouter()
const route = useRoute()

const tabs = [
  { label: 'Signups', to: '/admin/signups', icon: 'i-heroicons-users' },
  { label: 'Schedule', to: '/admin/schedule', icon: 'i-heroicons-calendar-days' },
  { label: 'Settings', to: '/admin/settings', icon: 'i-heroicons-cog-6-tooth' }
]

async function logout() {
  await $fetch('/api/logout', { method: 'POST' })
  await useUserSession().clear()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Header -->
    <header class="bg-white border-b border-neutral-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">P</span>
            </div>
            <h1 class="text-lg font-semibold tracking-tight">Dashboard</h1>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            @click="logout"
            class="text-neutral-500 hover:text-black"
          >
            <Icon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4 mr-2" />
            Logout
          </UButton>
        </div>
      </div>
    </header>

    <!-- Tab Navigation -->
    <div class="bg-white border-b border-neutral-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <nav class="flex gap-8">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            class="py-4 border-b-2 -mb-px transition-all flex items-center gap-2 text-sm font-medium"
            :class="route.path.startsWith(tab.to)
              ? 'border-black text-black'
              : 'border-transparent text-neutral-500 hover:text-black hover:border-neutral-300'"
          >
            <Icon :name="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </NuxtLink>
        </nav>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
