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

const experienceOptions = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' }
]

const loading = ref(false)
const submitted = ref(false)

async function onSubmit() {
  loading.value = true
  console.log('Submitting:', state)
  // TODO: API call
  submitted.value = true
  loading.value = false
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
    
    <UFormField label="Experience Level">
      <USelect v-model="state.experience" :items="experienceOptions" placeholder="Select your level" />
    </UFormField>
    
    <UFormField label="Message">
      <UTextarea v-model="state.message" placeholder="Any questions?" />
    </UFormField>
    
    <UButton type="submit" :loading="loading" block>
      Sign Up for Lessons
    </UButton>
  </form>
</template>