<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFetch } from '#imports'
import { $fetch } from 'ofetch'

interface TimeSlot {
  id: number
  date: string
  start_time: string
  end_time: string
  status: string
  booked_by: number | null
}

interface Signup {
  id: number
  name: string
  email: string
  phone: string | null
  experience: number | null
  location: string | null
  selected_slots: string | null
  no_availability: number | null
  message: string | null
  created_at: string
}

// Map location values to display names
const locationLabels: Record<string, string> = {
  'hot-shots': 'Hot Shots Pickleball Club',
  'lidas-ranch': "Lida's Pickleball Ranch",
  'orville-vitality': 'Orville Vitality'
}

const { data: signups, pending, refresh } = await useFetch<Signup[]>('/api/signups')
const { data: allSlots, refresh: refreshSlots } = await useFetch<TimeSlot[]>('/api/slots')

// Create a map of slot ID to slot details
const slotsMap = computed(() => {
  const map = new Map<number, TimeSlot>()
  if (allSlots.value) {
    for (const slot of allSlots.value) {
      map.set(slot.id, slot)
    }
  }
  return map
})

// Get slots for a signup
function getSignupSlots(signup: Signup): TimeSlot[] {
  if (!signup.selected_slots) return []
  try {
    const slotIds = JSON.parse(signup.selected_slots) as number[]
    return slotIds
      .map(id => slotsMap.value.get(id))
      .filter((s): s is TimeSlot => s !== undefined)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.start_time.localeCompare(b.start_time)
      })
  } catch {
    return []
  }
}

// Format slot for display
function formatSlot(slot: TimeSlot) {
  const date = new Date(slot.date + 'T00:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const timeParts = slot.start_time.split(':')
  const hourNum = parseInt(timeParts[0] || '0')
  const minStr = timeParts[1] || '00'
  const hour12 = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
  const ampm = hourNum >= 12 ? 'PM' : 'AM'

  return `${dayName} ${dateStr} @ ${hour12}:${minStr} ${ampm}`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Confirm a slot
const confirming = ref<number | null>(null)

async function confirmSlot(slotId: number) {
  confirming.value = slotId
  try {
    await $fetch(`/api/slots/${slotId}`, {
      method: 'PATCH',
      body: { status: 'confirmed' }
    })
    await refreshSlots()
  } catch (error) {
    console.error('Failed to confirm slot:', error)
  } finally {
    confirming.value = null
  }
}

// Cancel a slot (set back to available)
const cancelling = ref<number | null>(null)

// Track last cancelled slot for undo
interface CancelledSlot {
  slotId: number
  previousStatus: string
  signupId: number
}
const lastCancelled = ref<CancelledSlot | null>(null)
const undoTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

async function cancelSlot(slotId: number, signupId: number) {
  // Get current status before cancelling
  const slot = slotsMap.value.get(slotId)
  const previousStatus = slot?.status || 'pending'

  cancelling.value = slotId
  try {
    await $fetch(`/api/slots/${slotId}`, {
      method: 'PATCH',
      body: { status: 'available' }
    })

    // Store for undo
    lastCancelled.value = { slotId, previousStatus, signupId }

    // Clear undo option after 10 seconds
    if (undoTimeout.value) clearTimeout(undoTimeout.value)
    undoTimeout.value = setTimeout(() => {
      lastCancelled.value = null
    }, 10000)

    await refreshSlots()
  } catch (error) {
    console.error('Failed to cancel slot:', error)
  } finally {
    cancelling.value = null
  }
}

// Undo cancellation
const undoing = ref(false)

async function undoCancel() {
  if (!lastCancelled.value) return

  undoing.value = true
  try {
    await $fetch(`/api/slots/${lastCancelled.value.slotId}`, {
      method: 'PATCH',
      body: {
        status: lastCancelled.value.previousStatus,
        booked_by: lastCancelled.value.signupId
      }
    })

    if (undoTimeout.value) clearTimeout(undoTimeout.value)
    lastCancelled.value = null

    await refreshSlots()
  } catch (error) {
    console.error('Failed to undo cancellation:', error)
  } finally {
    undoing.value = false
  }
}

// Expanded rows for viewing slot details
const expandedRows = ref<Set<number>>(new Set())

function toggleRow(signupId: number) {
  if (expandedRows.value.has(signupId)) {
    expandedRows.value.delete(signupId)
  } else {
    expandedRows.value.add(signupId)
  }
}

defineExpose({ refresh })
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">All Signups</h2>
      <UButton variant="ghost" @click="refresh">
        <Icon name="i-heroicons-arrow-path" class="w-4 h-4" />
        Refresh
      </UButton>
    </div>

    <!-- Undo notification -->
    <div
      v-if="lastCancelled"
      class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <Icon name="i-heroicons-arrow-uturn-left" class="w-5 h-5 text-amber-600" />
        <span class="text-sm text-amber-800">Slot cancelled</span>
      </div>
      <UButton
        size="xs"
        color="amber"
        variant="soft"
        :loading="undoing"
        @click="undoCancel"
      >
        Undo
      </UButton>
    </div>

    <UCard>
      <div v-if="pending" class="text-center py-8">
        <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto" />
        <p class="mt-2 text-gray-600">Loading signups...</p>
      </div>

      <div v-else-if="!signups?.length" class="text-center py-8">
        <Icon name="i-heroicons-inbox" class="w-12 h-12 text-gray-400 mx-auto" />
        <p class="mt-2 text-gray-600">No signups yet</p>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="signup in signups"
          :key="signup.id"
          class="py-4"
        >
          <!-- Main row -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-medium">{{ signup.name }}</h3>
                <span v-if="signup.experience" class="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {{ signup.experience }} rating
                </span>
                <span
                  v-if="signup.no_availability === 1"
                  class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded"
                >
                  No availability
                </span>
              </div>
              <p class="text-sm text-gray-600">{{ signup.email }}</p>
              <p v-if="signup.phone" class="text-sm text-gray-500">{{ signup.phone }}</p>
              <p v-if="signup.location" class="text-sm text-gray-500">
                <Icon name="i-heroicons-map-pin" class="w-3 h-3 inline" />
                {{ locationLabels[signup.location] || signup.location }}
              </p>
              <p v-if="signup.message" class="text-sm text-gray-500 mt-1 italic">
                "{{ signup.message }}"
              </p>
              <p class="text-xs text-gray-400 mt-1">
                Submitted {{ formatDate(signup.created_at) }}
              </p>
            </div>

            <!-- Slot summary / expand button -->
            <div class="flex items-center gap-2">
              <template v-if="signup.no_availability !== 1 && signup.selected_slots">
                <button
                  class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  @click="toggleRow(signup.id)"
                >
                  {{ getSignupSlots(signup).length }} slot(s)
                  <Icon
                    :name="expandedRows.has(signup.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    class="w-4 h-4"
                  />
                </button>
              </template>
            </div>
          </div>

          <!-- Expanded slot details -->
          <div
            v-if="expandedRows.has(signup.id) && signup.selected_slots"
            class="mt-4 ml-4 space-y-2"
          >
            <div
              v-for="slot in getSignupSlots(signup)"
              :key="slot.id"
              class="flex items-center justify-between p-2 rounded-lg"
              :class="{
                'bg-yellow-50': slot.status === 'pending',
                'bg-green-50': slot.status === 'confirmed'
              }"
            >
              <div class="flex items-center gap-2">
                <Icon
                  v-if="slot.status === 'confirmed'"
                  name="i-heroicons-check-circle"
                  class="w-5 h-5 text-green-600"
                />
                <Icon
                  v-else
                  name="i-heroicons-clock"
                  class="w-5 h-5 text-yellow-600"
                />
                <span class="text-sm">{{ formatSlot(slot) }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="{
                    'bg-yellow-200 text-yellow-800': slot.status === 'pending',
                    'bg-green-200 text-green-800': slot.status === 'confirmed'
                  }"
                >
                  {{ slot.status }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  v-if="slot.status === 'pending'"
                  size="xs"
                  color="primary"
                  :loading="confirming === slot.id"
                  @click="confirmSlot(slot.id)"
                >
                  Confirm
                </UButton>
                <UButton
                  size="xs"
                  color="red"
                  variant="soft"
                  :loading="cancelling === slot.id"
                  @click="cancelSlot(slot.id, signup.id)"
                >
                  Cancel
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
