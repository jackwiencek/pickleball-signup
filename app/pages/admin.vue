<script setup lang="ts">
import { useUserSession,useRouter,useFetch } from '#imports'
import { $fetch } from 'ofetch'

const router = useRouter()

const { data: signups, pending, refresh } = await useFetch('/api/signups')

const columns = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'phone', accessorKey: 'phone', header: 'Phone' },
  { id: 'experience', accessorKey: 'experience', header: 'Experience' },
  { id: 'availability', accessorKey: 'availability', header: 'Availability' },
  { id: 'message', accessorKey: 'message', header: 'Message' },
  { id: 'created_at', accessorKey: 'created_at', header: 'Submitted' }
]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function parseAvailability(availability: string | null) {
  if (!availability) return '—'
  try {
    const parsed = JSON.parse(availability)
    return Array.isArray(parsed) ? parsed.join(', ') : availability
  } catch {
    return availability
  }
}

async function logout() {
  await $fetch('/api/logout', { method: 'POST' })
  await useUserSession().clear()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold">Signups Dashboard</h1>
        <div class="flex gap-2">
          <UButton variant="ghost" @click="refresh">
            <Icon name="i-heroicons-arrow-path" />
            Refresh
          </UButton>
          <UButton variant="outline" @click="logout">Logout</UButton>
        </div>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <UCard>
        <div v-if="pending" class="text-center py-8">
          <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto" />
          <p class="mt-2 text-gray-600">Loading signups...</p>
        </div>
        
        <div v-else-if="!signups?.length" class="text-center py-8">
          <Icon name="i-heroicons-inbox" class="w-12 h-12 text-gray-400 mx-auto" />
          <p class="mt-2 text-gray-600">No signups yet</p>
        </div>
        
        <UTable v-else :columns="columns" :data="signups">
          <template #availability-data="{ row }">
            {{ parseAvailability(row.availability) }}
          </template>
          
          <template #created_at-data="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
          
          <template #message-data="{ row }">
            <span class="truncate max-w-xs block">{{ row.message || '—' }}</span>
          </template>
        </UTable>
      </UCard>
    </main>
  </div>
</template>