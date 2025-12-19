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
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between items-center py-4">
          <h1 class="text-xl font-bold">Coach Dashboard</h1>
          <UButton variant="outline" @click="logout">Logout</UButton>
        </div>

        <!-- Tab Navigation -->
        <nav class="flex gap-1 -mb-px">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            class="px-4 py-2 border-b-2 transition-colors flex items-center gap-2"
            :class="route.path.startsWith(tab.to)
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            <Icon :name="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
