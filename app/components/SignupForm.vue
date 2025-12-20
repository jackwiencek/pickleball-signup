<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useFetch } from '#imports'

const state = reactive({
  name: '',
  email: '',
  phone: '',
  experience: '',
  location: '',
  selectedSlots: [] as number[],
  noAvailability: false,
  message: ''
})

const locationOptions = [
  { label: 'Hot Shots Pickleball Club', value: 'hot-shots' },
  { label: "Lida's Pickleball Ranch", value: 'lidas-ranch' },
  { label: 'Orville Vitality', value: 'orville-vitality' }
]

// Fetch available slots for the next 4 weeks
const today = new Date()
const fourWeeksLater = new Date(today)
fourWeeksLater.setDate(today.getDate() + 28)

const { data: availableSlots, pending: loadingSlots } = await useFetch('/api/slots', {
  query: {
    start: today.toISOString().split('T')[0],
    end: fourWeeksLater.toISOString().split('T')[0],
    available_only: 'true'
  }
})

// Slot type
interface TimeSlot {
  id: number
  date: string
  start_time: string
  end_time: string
  status: string
}

// Group slots by day
interface DayGroup {
  date: string
  dayLabel: string
  dateLabel: string
  slots: TimeSlot[]
}

const slotsByDay = computed((): DayGroup[] => {
  if (!availableSlots.value) return []

  const days = new Map<string, DayGroup>()
  const slots = ([...(availableSlots.value || [])] as unknown as TimeSlot[]).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.start_time.localeCompare(b.start_time)
  })

  for (const slot of slots) {
    let day = days.get(slot.date)
    if (!day) {
      const slotDate = new Date(slot.date + 'T00:00:00')
      day = {
        date: slot.date,
        dayLabel: slotDate.toLocaleDateString('en-US', { weekday: 'long' }),
        dateLabel: slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        slots: []
      }
      days.set(slot.date, day)
    }
    day.slots.push(slot)
  }

  return Array.from(days.values())
})

// Track expanded days (first day with slots expanded by default)
const expandedDays = ref<Set<string>>(new Set())

// Initialize with first day expanded
const firstDay = slotsByDay.value[0]
if (firstDay) {
  expandedDays.value.add(firstDay.date)
}

function toggleDay(date: string) {
  if (expandedDays.value.has(date)) {
    expandedDays.value.delete(date)
  } else {
    expandedDays.value.add(date)
  }
}

// Format time for chip display (shows range like "10:00 - 10:30 AM")
function formatTimeRange(startTime: string, endTime: string): string {
  const formatSingle = (time: string) => {
    const parts = time.split(':')
    const hourNum = parseInt(parts[0] || '0')
    const minStr = parts[1] || '00'
    const hour12 = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
    const ampm = hourNum >= 12 ? 'PM' : 'AM'
    return { formatted: `${hour12}:${minStr}`, ampm }
  }

  const start = formatSingle(startTime)
  const end = formatSingle(endTime)

  // If AM/PM is the same, only show it once at the end
  if (start.ampm === end.ampm) {
    return `${start.formatted} - ${end.formatted} ${end.ampm}`
  }
  return `${start.formatted} ${start.ampm} - ${end.formatted} ${end.ampm}`
}

// Toggle slot selection
function toggleSlot(slotId: number) {
  if (state.noAvailability) return

  const index = state.selectedSlots.indexOf(slotId)
  if (index > -1) {
    state.selectedSlots.splice(index, 1)
  } else {
    state.selectedSlots.push(slotId)
  }
}

// Check if slot is selected
function isSelected(slotId: number): boolean {
  return state.selectedSlots.includes(slotId)
}

// Count selected slots for a day
function selectedCountForDay(day: DayGroup): number {
  return day.slots.filter(s => state.selectedSlots.includes(s.id)).length
}

// Handle "no availability" toggle
function toggleNoAvailability() {
  state.noAvailability = !state.noAvailability
  if (state.noAvailability) {
    state.selectedSlots = []
  }
}

const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''

  // Validation
  if (!state.name || !state.email || !state.experience || !state.location) {
    errorMessage.value = 'Please fill in all required fields'
    return
  }

  if (!state.noAvailability && state.selectedSlots.length === 0) {
    errorMessage.value = 'Please select at least one time slot or check "None of these work"'
    return
  }

  loading.value = true

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: state.name,
        email: state.email,
        phone: state.phone,
        experience: state.experience,
        location: state.location,
        selected_slots: state.selectedSlots,
        no_availability: state.noAvailability ? 1 : 0,
        message: state.message
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to submit')
    }

    submitted.value = true
  } catch (error) {
    console.error('Submit error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="submitted" class="text-center py-8">
    <Icon name="i-heroicons-check-circle" class="w-16 h-16 text-green-500 mx-auto mb-4" />
    <p class="text-green-600 font-bold text-xl">Thanks for signing up!</p>
    <p class="text-gray-600 mt-2">The coach will review your request and get back to you soon.</p>
  </div>

  <form v-else @submit.prevent="onSubmit" class="space-y-6">
    <!-- Error message -->
    <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      {{ errorMessage }}
    </div>

    <!-- Personal Info -->
    <div class="space-y-4">
      <UFormField label="Name" required>
        <UInput v-model="state.name" placeholder="Your full name" />
      </UFormField>

      <UFormField label="Email" required>
        <UInput v-model="state.email" type="email" placeholder="you@example.com" />
      </UFormField>

      <UFormField label="Phone">
        <UInput v-model="state.phone" type="tel" placeholder="(555) 555-5555" />
      </UFormField>

      <UFormField label="Experience Level (1.0 - 8.0)" required>
        <UInput
          class="w-32"
          v-model="state.experience"
          type="number"
          step="0.1"
          min="1.0"
          max="8.0"
          placeholder="e.g. 3.5"
        />
      </UFormField>

      <UFormField label="Preferred Location" required>
        <USelect
          v-model="state.location"
          :items="locationOptions"
          placeholder="Select a location"
          value-key="value"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- Time Slot Selection -->
    <div>
      <label class="block text-sm font-medium mb-2">
        Select Available Times <span class="text-red-500">*</span>
      </label>

      <div v-if="loadingSlots" class="text-center py-4">
        <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mx-auto" />
        <p class="text-sm text-gray-500 mt-2">Loading available times...</p>
      </div>

      <div v-else-if="!slotsByDay.length" class="bg-gray-50 rounded-lg p-4 text-center">
        <p class="text-gray-600">No available time slots at the moment.</p>
        <p class="text-sm text-gray-500 mt-1">Please check back later or leave a message below.</p>
      </div>

      <div v-else class="space-y-2">
        <!-- Day Accordion -->
        <div
          v-for="day in slotsByDay"
          :key="day.date"
          class="border rounded-lg overflow-hidden"
          :class="{ 'opacity-50': state.noAvailability }"
        >
          <!-- Day Header (Accordion Toggle) -->
          <button
            type="button"
            class="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            :disabled="state.noAvailability"
            @click="toggleDay(day.date)"
          >
            <div class="flex items-center gap-2">
              <Icon
                :name="expandedDays.has(day.date) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="w-5 h-5 text-gray-500"
              />
              <span class="font-medium">{{ day.dayLabel }}</span>
              <span class="text-sm text-gray-500">{{ day.dateLabel }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">{{ day.slots.length }} slot(s)</span>
              <span
                v-if="selectedCountForDay(day) > 0"
                class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full"
              >
                {{ selectedCountForDay(day) }} selected
              </span>
            </div>
          </button>

          <!-- Time Chips (Expanded Content) -->
          <div
            v-if="expandedDays.has(day.date)"
            class="px-4 py-3 bg-white border-t"
          >
            <div class="flex flex-wrap gap-2">
              <button
                v-for="slot in day.slots"
                :key="slot.id"
                type="button"
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                :class="[
                  isSelected(slot.id)
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
                :disabled="state.noAvailability"
                @click="toggleSlot(slot.id)"
              >
                {{ formatTimeRange(slot.start_time, slot.end_time) }}
              </button>
            </div>
          </div>
        </div>

        <!-- No availability option -->
        <div class="border-t pt-4 mt-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              class="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              :checked="state.noAvailability"
              @change="toggleNoAvailability"
            >
            <span class="text-sm">
              <strong>None of these times work for me</strong>
              <span class="text-gray-500"> - Coach will contact you directly</span>
            </span>
          </label>
        </div>

        <!-- Selected count -->
        <p v-if="state.selectedSlots.length > 0" class="text-sm text-primary-600 font-medium">
          {{ state.selectedSlots.length }} time slot(s) selected
        </p>
      </div>
    </div>

    <!-- Message -->
    <UFormField label="Message (optional)">
      <UTextarea v-model="state.message" placeholder="Any questions or additional availability info" />
    </UFormField>

    <!-- Submit -->
    <UButton type="submit" :loading="loading" block>
      Sign Up for Lessons
    </UButton>
  </form>
</template>
