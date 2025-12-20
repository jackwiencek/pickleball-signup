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
  { label: '30 minutes', value: '30' }
  // { label: '60 minutes', value: '60' }
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
  <div class="max-w-2xl">
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-black">Settings</h2>
      <p class="text-sm text-neutral-500 mt-1">Configure your scheduling preferences</p>
    </div>

    <div class="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
      <!-- Slot Duration -->
      <div class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h3 class="font-semibold text-black">Slot Duration</h3>
            <p class="text-sm text-neutral-500 mt-1">
              How long each time slot should be on the schedule grid.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <USelect
              v-model="selectedDuration"
              :items="durationOptions"
              value-key="value"
              class="w-40"
              size="sm"
            />
            <UButton
              :loading="saving"
              size="sm"
              class="!bg-black !text-white hover:!bg-neutral-800"
              @click="saveDuration"
            >
              Save
            </UButton>
            <span v-if="saved" class="text-black text-sm flex items-center gap-1">
              <Icon name="i-heroicons-check" class="w-4 h-4" />
            </span>
          </div>
        </div>
        <p class="text-xs text-neutral-400 mt-3">
          Note: Changing this affects the schedule grid display. Existing slots are not modified.
        </p>
      </div>

      <!-- Future settings placeholder -->
      <div class="p-6">
        <div class="text-center py-8">
          <Icon name="i-heroicons-cog-6-tooth" class="w-8 h-8 text-neutral-300 mx-auto" />
          <p class="text-sm text-neutral-400 mt-3">More settings coming soon</p>
        </div>
      </div>
    </div>
  </div>
</template>
