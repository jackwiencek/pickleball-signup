<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFetch } from '#imports'
import { $fetch } from 'ofetch'

// Current week offset (0 = this week, 1 = next week, etc.)
const weekOffset = ref(0)

// Get settings for slot duration
const { data: settings } = await useFetch('/api/settings')
const slotDuration = computed(() => {
  const setting = settings.value?.find((s: any) => s.key === 'slot_duration')
  return parseInt(setting?.value || '60')
})

// Calculate the start of the displayed week (Monday)
const weekStart = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + (weekOffset.value * 7))
  monday.setHours(0, 0, 0, 0)
  return monday
})

const weekEnd = computed(() => {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 6)
  return end
})

// Format date range for display
const weekRangeDisplay = computed(() => {
  const start = weekStart.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = weekEnd.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${start} - ${end}`
})

// Days of the week
const days = computed(() => {
  const result = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.value)
    date.setDate(date.getDate() + i)
    result.push({
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toISOString().split('T')[0],
      display: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  return result
})

// Time slots based on duration (6 AM - 9 PM)
const timeSlots = computed(() => {
  const slots = []
  const startHour = 6
  const endHour = 21 // 9 PM
  const duration = slotDuration.value

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += duration) {
    const hour = Math.floor(minutes / 60)
    const min = minutes % 60
    const time24 = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const display = `${hour12}:${min.toString().padStart(2, '0')} ${ampm}`

    // Calculate end time
    const endMinutes = minutes + duration
    const endHr = Math.floor(endMinutes / 60)
    const endMin = endMinutes % 60
    const endTime24 = `${endHr.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`

    slots.push({ time: time24, endTime: endTime24, display })
  }
  return slots
})

// Fetch slots for current week
const { data: existingSlots, refresh: refreshSlots } = await useFetch('/api/slots', {
  query: computed(() => ({
    start: weekStart.value.toISOString().split('T')[0],
    end: weekEnd.value.toISOString().split('T')[0]
  }))
})

// Check if a slot exists for a given date and time
function getSlot(date: string, startTime: string) {
  return existingSlots.value?.find(
    (s: any) => s.date === date && s.start_time === startTime
  )
}

// Toggle slot availability
async function toggleSlot(date: string, startTime: string, endTime: string) {
  const existing = getSlot(date, startTime)

  if (existing) {
    // Delete the slot if it's available (not booked)
    if (existing.status === 'available') {
      await $fetch(`/api/slots/${existing.id}`, { method: 'DELETE' })
    }
    // Can't delete pending/confirmed slots from here
  } else {
    // Create new slot
    await $fetch('/api/slots', {
      method: 'POST',
      body: { date, start_time: startTime, end_time: endTime }
    })
  }

  await refreshSlots()
}

// Get cell styling based on slot status
function getCellClass(date: string, startTime: string) {
  const slot = getSlot(date, startTime)
  if (!slot) return 'bg-gray-100 hover:bg-green-100 cursor-pointer'

  switch (slot.status) {
    case 'available':
      return 'bg-green-200 hover:bg-green-300 cursor-pointer'
    case 'pending':
      return 'bg-yellow-200 cursor-not-allowed'
    case 'confirmed':
      return 'bg-blue-200 cursor-not-allowed'
    default:
      return 'bg-gray-100'
  }
}

// Apply schedule to future weeks
const applyWeeksCount = ref(4)
const applying = ref(false)

async function applyToWeeks() {
  applying.value = true

  // Get all available slots from current week
  const currentSlots = existingSlots.value?.filter((s: any) => s.status === 'available') || []

  if (currentSlots.length === 0) {
    applying.value = false
    return
  }

  // Create slots for future weeks
  const bulkSlots = []
  for (let week = 1; week <= applyWeeksCount.value; week++) {
    for (const slot of currentSlots) {
      const slotDate = new Date(slot.date)
      slotDate.setDate(slotDate.getDate() + (week * 7))
      bulkSlots.push({
        date: slotDate.toISOString().split('T')[0],
        start_time: slot.start_time,
        end_time: slot.end_time
      })
    }
  }

  await $fetch('/api/slots/bulk', {
    method: 'POST',
    body: { slots: bulkSlots }
  })

  applying.value = false
  await refreshSlots()
}

// Navigation
function prevWeek() {
  weekOffset.value--
}

function nextWeek() {
  weekOffset.value++
}

function goToToday() {
  weekOffset.value = 0
}
</script>

<template>
  <div>
    <!-- Header with navigation -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h2 class="text-lg font-semibold">Weekly Schedule</h2>
        <p class="text-sm text-gray-500">Click cells to toggle availability</p>
      </div>

      <div class="flex items-center gap-2">
        <UButton variant="ghost" size="sm" @click="prevWeek">
          <Icon name="i-heroicons-chevron-left" />
        </UButton>
        <UButton variant="ghost" size="sm" @click="goToToday">Today</UButton>
        <span class="font-medium min-w-[180px] text-center">{{ weekRangeDisplay }}</span>
        <UButton variant="ghost" size="sm" @click="nextWeek">
          <Icon name="i-heroicons-chevron-right" />
        </UButton>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-4 mb-4 text-sm">
      <div class="flex items-center gap-1">
        <div class="w-4 h-4 bg-gray-100 rounded"></div>
        <span>Unavailable</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-4 h-4 bg-green-200 rounded"></div>
        <span>Available</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-4 h-4 bg-yellow-200 rounded"></div>
        <span>Pending</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-4 h-4 bg-blue-200 rounded"></div>
        <span>Confirmed</span>
      </div>
    </div>

    <!-- Schedule Grid -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="p-2 border-b text-left w-20">Time</th>
              <th
                v-for="day in days"
                :key="day.date"
                class="p-2 border-b text-center min-w-[100px]"
              >
                <div class="font-medium">{{ day.name }}</div>
                <div class="text-xs text-gray-500">{{ day.display }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.time">
              <td class="p-2 border-b text-sm font-medium">{{ slot.display }}</td>
              <td
                v-for="day in days"
                :key="`${day.date}-${slot.time}`"
                class="p-1 border-b"
              >
                <div
                  :class="[
                    'h-10 rounded transition-colors flex items-center justify-center text-xs',
                    getCellClass(day.date, slot.time)
                  ]"
                  @click="toggleSlot(day.date, slot.time, slot.endTime)"
                >
                  <template v-if="getSlot(day.date, slot.time)?.status === 'pending'">
                    Pending
                  </template>
                  <template v-else-if="getSlot(day.date, slot.time)?.status === 'confirmed'">
                    Booked
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Apply to future weeks -->
    <UCard class="mt-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="flex-1">
          <h3 class="font-medium">Apply to Future Weeks</h3>
          <p class="text-sm text-gray-500">Copy this week's available slots to upcoming weeks</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm">Next</span>
          <UInput
            v-model="applyWeeksCount"
            type="number"
            min="1"
            max="12"
            class="w-16"
          />
          <span class="text-sm">weeks</span>
          <UButton :loading="applying" @click="applyToWeeks">
            Apply
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
