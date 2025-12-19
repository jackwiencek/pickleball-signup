<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useFetch } from '#imports'

const state = reactive({
  name: '',
  email: '',
  phone: '',
  experience: '',
  selectedSlots: [] as number[],
  noAvailability: false,
  message: ''
})

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

// Group slots by week
const slotsByWeek = computed(() => {
  if (!availableSlots.value) return []

  const weeks: { weekStart: Date; weekLabel: string; slots: TimeSlot[] }[] = []
  const slots = ([...(availableSlots.value || [])] as unknown as TimeSlot[]).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.start_time.localeCompare(b.start_time)
  })

  for (const slot of slots) {
    const slotDate = new Date(slot.date + 'T00:00:00')
    const dayOfWeek = slotDate.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(slotDate)
    weekStart.setDate(slotDate.getDate() + diff)

    let week = weeks.find(w => w.weekStart.getTime() === weekStart.getTime())
    if (!week) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      week = {
        weekStart,
        weekLabel: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        slots: []
      }
      weeks.push(week)
    }
    week.slots.push(slot)
  }

  return weeks.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
})

// Format slot for display
function formatSlot(slot: TimeSlot) {
  const date = new Date(slot.date + 'T00:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Convert 24h to 12h format
  const timeParts = slot.start_time.split(':')
  const hourNum = parseInt(timeParts[0] || '0')
  const minStr = timeParts[1] || '00'
  const hour12 = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
  const ampm = hourNum >= 12 ? 'PM' : 'AM'
  const timeStr = `${hour12}:${minStr} ${ampm}`

  return `${dayName} ${dateStr} - ${timeStr}`
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
  if (!state.name || !state.email || !state.experience) {
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

      <div v-else-if="!slotsByWeek.length" class="bg-gray-50 rounded-lg p-4 text-center">
        <p class="text-gray-600">No available time slots at the moment.</p>
        <p class="text-sm text-gray-500 mt-1">Please check back later or leave a message below.</p>
      </div>

      <div v-else class="space-y-4">
        <!-- Slots grouped by week -->
        <div v-for="week in slotsByWeek" :key="week.weekLabel" class="border rounded-lg p-4">
          <h4 class="font-medium text-gray-700 mb-3">{{ week.weekLabel }}</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              v-for="slot in week.slots"
              :key="slot.id"
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
              :class="{ 'opacity-50 cursor-not-allowed': state.noAvailability }"
            >
              <input
                type="checkbox"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                :checked="state.selectedSlots.includes(slot.id)"
                :disabled="state.noAvailability"
                @change="toggleSlot(slot.id)"
              >
              <span class="text-sm">{{ formatSlot(slot) }}</span>
            </label>
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
        <p v-if="state.selectedSlots.length > 0" class="text-sm text-primary-600">
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
