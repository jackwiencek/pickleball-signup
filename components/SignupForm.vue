<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useToast } from '#imports'
import { $fetch } from 'ofetch'

const toast = useToast()

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
    await $fetch('/api/signup', {
      method: 'POST',
      body: {
        ...state,
        availability: JSON.stringify(state.availability)
      }
    })
    
    submitted.value = true
    toast.add({ title: 'Success!', description: 'Your signup has been submitted.' })
  } catch (error) {
    toast.add({ title: 'Error', description: 'Something went wrong. Please try again.', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="submitted" class="text-center py-12">
    <Icon name="i-heroicons-check-circle" class="w-16 h-16 text-green-500 mx-auto mb-4" />
    <h2 class="text-2xl font-bold mb-2">Thanks for signing up!</h2>
    <p class="text-gray-600">We'll be in touch soon about your pickleball lessons.</p>
  </div>
  
  <UForm v-else :state="state" @submit="onSubmit" class="space-y-6">
    <UFormGroup label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="Your full name" />
    </UFormGroup>
    
    <UFormGroup label="Email" name="email" required>
      <UInput v-model="state.email" type="email" placeholder="you@example.com" />
    </UFormGroup>
    
    <UFormGroup label="Phone" name="phone">
      <UInput v-model="state.phone" type="tel" placeholder="(555) 555-5555" />
    </UFormGroup>
    
    <UFormGroup label="Experience Level" name="experience">
      <USelect v-model="state.experience" :options="experienceOptions" placeholder="Select your level" />
    </UFormGroup>
    
    <UFormGroup label="Availability" name="availability">
      <USelectMenu
        v-model="state.availability"
        :options="availabilityOptions"
        multiple
        placeholder="Select available times"
      />
    </UFormGroup>
    
    <UFormGroup label="Message (optional)" name="message">
      <UTextarea v-model="state.message" placeholder="Any questions or notes?" />
    </UFormGroup>
    
    <UButton type="submit" :loading="loading" block>
      Sign Up for Lessons
    </UButton>
  </UForm>
</template>