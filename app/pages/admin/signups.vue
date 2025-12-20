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
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-semibold text-black">Signups</h2>
        <p class="text-sm text-neutral-500 mt-1">Manage lesson requests</p>
      </div>
      <UButton variant="ghost" color="neutral" @click="refresh" class="text-neutral-500">
        <Icon name="i-heroicons-arrow-path" class="w-4 h-4" />
      </UButton>
    </div>

    <!-- Undo notification -->
    <div
      v-if="lastCancelled"
      class="mb-4 p-4 bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <Icon name="i-heroicons-arrow-uturn-left" class="w-5 h-5 text-neutral-600" />
        <span class="text-sm text-neutral-700">Slot cancelled</span>
      </div>
      <UButton
        size="xs"
        variant="soft"
        color="neutral"
        :loading="undoing"
        @click="undoCancel"
        class="!bg-black !text-white hover:!bg-neutral-800"
      >
        Undo
      </UButton>
    </div>

    <!-- Content Card -->
    <div class="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div v-if="pending" class="text-center py-16">
        <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mx-auto text-neutral-400" />
        <p class="mt-3 text-neutral-500">Loading signups...</p>
      </div>

      <div v-else-if="!signups?.length" class="text-center py-16">
        <Icon name="i-heroicons-inbox" class="w-10 h-10 text-neutral-300 mx-auto" />
        <p class="mt-3 text-neutral-500">No signups yet</p>
      </div>

      <div v-else class="divide-y divide-neutral-100">
        <div
          v-for="signup in signups"
          :key="signup.id"
          class="p-5 hover:bg-neutral-50 transition-colors"
        >
          <!-- Main row -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="font-semibold text-black">{{ signup.name }}</h3>
                <span v-if="signup.experience" class="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                  {{ signup.experience }}
                </span>
                <span
                  v-if="signup.no_availability === 1"
                  class="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full"
                >
                  Contact needed
                </span>
              </div>
              <p class="text-sm text-neutral-600">{{ signup.email }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-neutral-500">
                <span v-if="signup.phone">{{ signup.phone }}</span>
                <span v-if="signup.location" class="flex items-center gap-1">
                  <Icon name="i-heroicons-map-pin" class="w-3 h-3" />
                  {{ locationLabels[signup.location] || signup.location }}
                </span>
              </div>
              <p v-if="signup.message" class="text-sm text-neutral-500 mt-2 italic border-l-2 border-neutral-200 pl-3">
                "{{ signup.message }}"
              </p>
              <p class="text-xs text-neutral-400 mt-2">
                {{ formatDate(signup.created_at) }}
              </p>
            </div>

            <!-- Slot summary / expand button -->
            <div class="flex items-center gap-2">
              <template v-if="signup.no_availability !== 1 && signup.selected_slots">
                <button
                  class="text-sm text-black hover:text-neutral-600 flex items-center gap-1 font-medium"
                  @click="toggleRow(signup.id)"
                >
                  {{ getSignupSlots(signup).length }} slot{{ getSignupSlots(signup).length !== 1 ? 's' : '' }}
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
            class="mt-4 space-y-2"
          >
            <div
              v-for="slot in getSignupSlots(signup)"
              :key="slot.id"
              class="flex items-center justify-between p-3 rounded-xl border"
              :class="{
                'bg-neutral-50 border-neutral-200': slot.status === 'pending',
                'bg-black/5 border-black/10': slot.status === 'confirmed'
              }"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center"
                  :class="{
                    'bg-neutral-200': slot.status === 'pending',
                    'bg-black': slot.status === 'confirmed'
                  }"
                >
                  <Icon
                    v-if="slot.status === 'confirmed'"
                    name="i-heroicons-check"
                    class="w-4 h-4 text-white"
                  />
                  <Icon
                    v-else
                    name="i-heroicons-clock"
                    class="w-4 h-4 text-neutral-600"
                  />
                </div>
                <div>
                  <span class="text-sm font-medium text-black">{{ formatSlot(slot) }}</span>
                  <span
                    class="ml-2 text-xs px-2 py-0.5 rounded-full"
                    :class="{
                      'bg-neutral-200 text-neutral-700': slot.status === 'pending',
                      'bg-black text-white': slot.status === 'confirmed'
                    }"
                  >
                    {{ slot.status }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  v-if="slot.status === 'pending'"
                  size="xs"
                  :loading="confirming === slot.id"
                  @click="confirmSlot(slot.id)"
                  class="!bg-black !text-white hover:!bg-neutral-800"
                >
                  Confirm
                </UButton>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :loading="cancelling === slot.id"
                  @click="cancelSlot(slot.id, signup.id)"
                  class="text-neutral-500 hover:text-black"
                >
                  Cancel
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
