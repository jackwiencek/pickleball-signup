<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFetch } from '#imports'
import { $fetch } from 'ofetch'

interface Setting {
  key: string
  value: string
}

const { data: settings, refresh } = await useFetch<Setting[]>('/api/settings')

const slotDuration = computed({
  get: () => {
    const setting = settings.value?.find((s) => s.key === 'slot_duration')
    return setting?.value || '60'
  },
  set: () => {} // Handled by save function
})

const selectedDuration = ref(slotDuration.value)
const saving = ref(false)
const saved = ref(false)

const durationOptions = [
  { label: '30 minutes', value: '30' },
  { label: '45 minutes', value: '45' },
  { label: '60 minutes', value: '60' },
  { label: '90 minutes', value: '90' }
]

async function saveDuration() {
  saving.value = true
  saved.value = false

  await $fetch('/api/settings', {
    method: 'POST',
    body: { key: 'slot_duration', value: selectedDuration.value }
  })

  await refresh()
  saving.value = false
  saved.value = true

  setTimeout(() => {
    saved.value = false
  }, 2000)
}

// Watch for initial load
watch(slotDuration, (newVal) => {
  selectedDuration.value = newVal
}, { immediate: true })
</script>

<template>
  <div class="max-w-xl">
    <h2 class="text-lg font-semibold mb-6">Settings</h2>

    <UCard>
      <div class="space-y-6">
        <!-- Slot Duration -->
        <div>
          <h3 class="font-medium mb-2">Default Slot Duration</h3>
          <p class="text-sm text-gray-500 mb-3">
            How long each time slot should be on the schedule grid.
          </p>

          <div class="flex items-center gap-4">
            <USelect
              v-model="selectedDuration"
              :items="durationOptions"
              value-key="value"
              class="w-48"
            />

            <UButton :loading="saving" @click="saveDuration">
              Save
            </UButton>

            <span v-if="saved" class="text-green-600 text-sm">
              <Icon name="i-heroicons-check" class="w-4 h-4" />
              Saved!
            </span>
          </div>

          <p class="text-xs text-amber-600 mt-2">
            Note: Changing this will affect how the schedule grid displays. Existing slots will not be modified.
          </p>
        </div>

        <hr />

        <!-- Future settings can go here -->
        <div class="text-sm text-gray-500">
          More settings coming soon (booking limits, email notifications, etc.)
        </div>
      </div>
    </UCard>
  </div>
</template>
