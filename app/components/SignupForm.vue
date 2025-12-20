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
  { label: ' Vitality Fitness', value: 'orville-vitality' }
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
  <!-- Success State -->
  <div v-if="submitted" class="text-center py-12">
    <div class="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
      <Icon name="i-heroicons-check" class="w-8 h-8 text-white" />
    </div>
    <h2 class="text-2xl font-bold text-black mb-2">You're all set!</h2>
    <p class="text-neutral-500">Coach Joe will review your request and get back to you soon.</p>
  </div>

  <form v-else @submit.prevent="onSubmit" class="space-y-8">
    <!-- Error message -->
    <div v-if="errorMessage" class="bg-neutral-100 border border-neutral-300 text-neutral-800 px-4 py-3 rounded-xl flex items-center gap-3">
      <Icon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
      <span class="text-sm">{{ errorMessage }}</span>
    </div>

    <!-- Personal Info Section -->
    <div>
      <h3 class="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">Your Information</h3>
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Name" required>
            <UInput v-model="state.name" placeholder="Your full name" size="lg"/>
          </UFormField>

          <UFormField label="Phone">
            <UInput v-model="state.phone" type="tel" placeholder="(555) 555-5555" size="lg" />
          </UFormField>
        </div>
        

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Email" required>
            <UInput v-model="state.email" type="email" placeholder="you@example.com" size="lg" />
          </UFormField>

          <UFormField label="Location" required>
            <USelect
              v-model="state.location"
              :items="locationOptions"
              placeholder="Select location"
              value-key="value"
              size="lg"
              class="w-64"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Skill Level (1.0 - 8.0)" required>
            <UInput
              v-model="state.experience"
              type="number"
              step="0.1"
              min="1.0"
              max="8.0"
              placeholder="e.g. 3.5"
              size="lg"
            />
          </UFormField>

          
        </div>
      </div>
    </div>

    <!-- Time Slot Selection -->
    <div>
      <h3 class="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">Select Times</h3>

      <div v-if="loadingSlots" class="py-8 text-center">
        <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mx-auto text-neutral-400" />
        <p class="text-sm text-neutral-500 mt-3">Loading available times...</p>
      </div>

      <div v-else-if="!slotsByDay.length" class="bg-primary-200 rounded-xl p-6 text-center">
        <Icon name="i-heroicons-calendar" class="w-8 h-8 text-neutral-300 mx-auto mb-3" />
        <p class="text-neutral-600 font-medium">No available slots</p>
        <p class="text-sm text-neutral-400 mt-1">Check back later or leave a message below.</p>
      </div>

      <div v-else class="space-y-3">
        <!-- Day Accordion -->
        <div
          v-for="day in slotsByDay"
          :key="day.date"
          class="border border-neutral-200 rounded-xl overflow-hidden transition-all"
          :class="{ 'opacity-40': state.noAvailability }"
        >
          <!-- Day Header -->
          <button
            type="button"
            class="w-full px-4 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
            :disabled="state.noAvailability"
            @click="toggleDay(day.date)"
          >
            <div class="flex items-center gap-3">
              <Icon
                :name="expandedDays.has(day.date) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="w-4 h-4 text-neutral-400"
              />
              <span class="font-semibold text-black">{{ day.dayLabel }}</span>
              <span class="text-neutral-400">{{ day.dateLabel }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-neutral-400">{{ day.slots.length }} available</span>
              <span
                v-if="selectedCountForDay(day) > 0"
                class="text-xs bg-black text-white px-2.5 py-1 rounded-full font-medium"
              >
                {{ selectedCountForDay(day) }}
              </span>
            </div>
          </button>

          <!-- Time Chips -->
          <div
            v-if="expandedDays.has(day.date)"
            class="px-4 py-4 bg-white border-t border-neutral-100"
          >
            <div class="flex flex-wrap gap-2">
              <button
                v-for="slot in day.slots"
                :key="slot.id"
                type="button"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                :class="[
                  isSelected(slot.id)
                    ? 'bg-black text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
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
        <div class="pt-4 mt-2">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
              :class="state.noAvailability ? 'bg-black border-black' : 'border-neutral-300 group-hover:border-neutral-400'"
            >
              <Icon v-if="state.noAvailability" name="i-heroicons-check" class="w-3 h-3 text-white" />
            </div>
            <input
              type="checkbox"
              class="sr-only"
              :checked="state.noAvailability"
              @change="toggleNoAvailability"
            >
            <span class="text-sm text-neutral-600">
              <span class="font-medium text-black">None of these times work</span>
              <span class="hidden sm:inline"> - Coach will contact you directly</span>
            </span>
          </label>
        </div>

        <!-- Selected count -->
        <p v-if="state.selectedSlots.length > 0" class="text-sm text-black font-medium pt-2">
          {{ state.selectedSlots.length }} time slot{{ state.selectedSlots.length > 1 ? 's' : '' }} selected
        </p>
      </div>
    </div>

    <!-- Message -->
    <div>
      <h3 class="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">Additional Info</h3>
      <UFormField label="Message (optional)">
        <UTextarea
          v-model="state.message"
          placeholder="Any questions or notes for the coach..."
          :rows="3"
          size="lg"
        />
      </UFormField>
    </div>

    <!-- Submit -->
    <UButton
      type="submit"
      :loading="loading"
      block
      size="xl"
      class="!bg-black hover:!bg-neutral-800 !text-white font-semibold"
    >
      Book Lesson
    </UButton>
  </form>
</template>
