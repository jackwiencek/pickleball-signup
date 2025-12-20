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
  return parseInt(setting?.value || '30')
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

// Grid time slot interface
interface GridTimeSlot {
  time: string
  endTime: string
  display: string
}

// Time slots based on duration (6 AM - 9 PM)
const timeSlots = computed((): GridTimeSlot[] => {
  const slots: GridTimeSlot[] = []
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

// Helper to convert time string to minutes
function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0')
}

// Find any slot that overlaps with the given time range
function getOverlappingSlot(date: string, cellStart: string, cellEnd: string) {
  const cellStartMins = timeToMinutes(cellStart)
  const cellEndMins = timeToMinutes(cellEnd)

  // Find slots that overlap with this cell's time range
  // Prioritize: confirmed > pending > available
  const overlapping = (existingSlots.value || [])
    .filter((s: { date: string; start_time: string; end_time: string }) => {
      if (s.date !== date) return false
      const slotStart = timeToMinutes(s.start_time)
      const slotEnd = timeToMinutes(s.end_time)
      // Overlap: slot starts before cell ends AND slot ends after cell starts
      return slotStart < cellEndMins && slotEnd > cellStartMins
    })
    .sort((a: { status: string }, b: { status: string }) => {
      // Priority: confirmed > pending > available
      const priority: Record<string, number> = { confirmed: 0, pending: 1, available: 2 }
      return (priority[a.status] ?? 3) - (priority[b.status] ?? 3)
    })

  return overlapping[0]
}

// Check if a slot exists with exact start time (for toggling)
function getExactSlot(date: string, startTime: string) {
  return existingSlots.value?.find(
    (s: { date: string; start_time: string }) => s.date === date && s.start_time === startTime
  )
}

// Toggle slot availability
async function toggleSlot(date: string, startTime: string, endTime: string) {
  const overlapping = getOverlappingSlot(date, startTime, endTime)

  // Don't allow changes if there's an overlapping pending/confirmed slot
  if (overlapping && overlapping.status !== 'available') {
    return
  }

  const exactSlot = getExactSlot(date, startTime)

  if (exactSlot) {
    // Delete the slot if it's available (not booked)
    if (exactSlot.status === 'available') {
      await $fetch(`/api/slots/${exactSlot.id}`, { method: 'DELETE' })
    }
  } else if (!overlapping) {
    // Only create new slot if nothing overlaps
    await $fetch('/api/slots', {
      method: 'POST',
      body: { date, start_time: startTime, end_time: endTime }
    })
  }

  await refreshSlots()
}

// Get cell styling based on slot status (using overlap detection)
function getCellClass(date: string, startTime: string, endTime: string) {
  const slot = getOverlappingSlot(date, startTime, endTime)
  if (!slot) return 'bg-neutral-100 hover:bg-neutral-200 cursor-pointer'

  switch (slot.status) {
    case 'available':
      return 'bg-green-200 hover:bg-green-300 cursor-pointer'
    case 'pending':
      return 'bg-yellow-200 cursor-not-allowed'
    case 'confirmed':
      return 'bg-blue-200 cursor-not-allowed'
    default:
      return 'bg-neutral-100'
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
        <h2 class="text-xl font-semibold text-black">Schedule</h2>
        <p class="text-sm text-neutral-500 mt-1">Click cells to toggle availability</p>
      </div>

      <div class="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
        <UButton variant="ghost" size="sm" color="neutral" @click="prevWeek" class="rounded-lg">
          <Icon name="i-heroicons-chevron-left" class="w-4 h-4" />
        </UButton>
        <UButton variant="ghost" size="sm" color="neutral" @click="goToToday" class="rounded-lg text-neutral-600">
          Today
        </UButton>
        <span class="font-medium min-w-[160px] text-center text-sm text-black px-2">{{ weekRangeDisplay }}</span>
        <UButton variant="ghost" size="sm" color="neutral" @click="nextWeek" class="rounded-lg">
          <Icon name="i-heroicons-chevron-right" class="w-4 h-4" />
        </UButton>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-4 mb-6 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-neutral-100 rounded border border-neutral-200"></div>
        <span class="text-neutral-600">Unavailable</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-green-300 rounded"></div>
        <span class="text-neutral-600">Available</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-yellow-400 rounded"></div>
        <span class="text-neutral-600">Pending</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-blue-500 rounded"></div>
        <span class="text-neutral-600">Confirmed</span>
      </div>
    </div>

    <!-- Schedule Grid -->
    <div class="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-neutral-50">
              <th class="p-3 border-b border-neutral-200 text-left w-20 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Time</th>
              <th
                v-for="day in days"
                :key="day.date"
                class="p-3 border-b border-neutral-200 text-center min-w-[100px]"
              >
                <div class="font-semibold text-black text-sm">{{ day.name }}</div>
                <div class="text-xs text-neutral-400">{{ day.display }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.time" class="hover:bg-neutral-50/50">
              <td class="p-2 border-b border-neutral-100 text-xs font-medium text-neutral-500">{{ slot.display }}</td>
              <td
                v-for="day in days"
                :key="`${day.date}-${slot.time}`"
                class="p-1 border-b border-neutral-100"
              >
                <div
                  :class="[
                    'h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-xs font-medium',
                    getCellClass(day.date, slot.time, slot.endTime)
                  ]"
                  @click="toggleSlot(day.date, slot.time, slot.endTime)"
                >
                  <template v-if="getOverlappingSlot(day.date, slot.time, slot.endTime)?.status === 'pending'">
                    <span class="text-neutral-700">Pending</span>
                  </template>
                  <template v-else-if="getOverlappingSlot(day.date, slot.time, slot.endTime)?.status === 'confirmed'">
                    <span class="text-white">Booked</span>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Apply to future weeks -->
    <div class="mt-6 bg-white border border-neutral-200 rounded-2xl p-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="flex-1">
          <h3 class="font-semibold text-black">Apply to Future Weeks</h3>
          <p class="text-sm text-neutral-500 mt-1">Copy this week's available slots to upcoming weeks</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-neutral-600">Next</span>
          <UInput
            v-model="applyWeeksCount"
            type="number"
            min="1"
            max="12"
            class="w-16"
            size="sm"
          />
          <span class="text-sm text-neutral-600">weeks</span>
          <UButton
            :loading="applying"
            @click="applyToWeeks"
            class="!bg-black !text-white hover:!bg-neutral-800"
          >
            Apply
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
