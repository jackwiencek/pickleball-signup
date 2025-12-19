<script setup lang="ts">
import { reactive, ref } from 'vue'

const state = reactive({
  name: '',
  email: '',
  phone: '',
  experience: '',
  availability: [] as string[],
  message: ''
})


const availabilityOptions = [
  { label: 'Monday Morning', value: 'mon-am' },
  { label: 'Monday Evening', value: 'mon-pm' },
  { label: 'Tuesday Morning', value: 'tue-am' },
  { label: 'Tuesday Evening', value: 'tue-pm' },
  { label: 'Wednesday Morning', value: 'wed-am' },
  { label: 'Wednesday Evening', value: 'wed-pm' },
  { label: 'Thursday Morning', value: 'thu-am' },
  { label: 'Thursday Evening', value: 'thu-pm' },
  { label: 'Friday Morning', value: 'fri-am' },
  { label: 'Friday Evening', value: 'fri-pm' },
  { label: 'Saturday', value: 'sat' },
  { label: 'Sunday', value: 'sun' }
]

const loading = ref(false)
const submitted = ref(false)

async function onSubmit() {
  loading.value = true
  
  try {
    await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
    submitted.value = true
  } catch (error) {
    console.error('Submit error:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="submitted" class="text-center py-8">
    <p class="text-green-600 font-bold text-xl">Thanks for signing up!</p>
  </div>
  
  <form v-else @submit.prevent="onSubmit" class="space-y-4">
    <UFormField label="Name" required>
      <UInput v-model="state.name" placeholder="Your full name" />
    </UFormField>
    
    <UFormField label="Email" required>
      <UInput v-model="state.email" type="email" placeholder="you@example.com" />
    </UFormField>
    
    <UFormField label="Phone">
      <UInput v-model="state.phone" type="tel" placeholder="(555) 555-5555" />
    </UFormField>
    
    <UFormField label="Experience Level" required>
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

    <UFormField label="Availability">
      <USelect v-model="state.availability" :items="availabilityOptions" placeholder="General Availability" multiple />
    </UFormField>
    
    <UFormField label="Message">
      <UTextarea v-model="state.message" placeholder="Enter questions or availability info" />
    </UFormField>
    
    <UButton type="submit" :loading="loading" block>
      Sign Up for Lessons
    </UButton>
  </form>
</template>