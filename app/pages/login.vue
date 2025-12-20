<script setup lang="ts">
import { ref } from 'vue'
import { useUserSession,useToast,useRouter } from '#imports'
import { $fetch } from 'ofetch'

const toast = useToast()
const router = useRouter()

const password = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  
  try {
    await $fetch('/api/login', {
      method: 'POST',
      body: { password: password.value }
    })
    
    // Refresh session state
    await useUserSession().fetch()
    
    router.push('/admin')
  } catch (error) {
    toast.add({ title: 'Error', description: 'Invalid password', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-xl">P</span>
        </div>
        <h1 class="text-2xl font-bold text-black">Coach Login</h1>
        <p class="text-neutral-500 mt-2 text-sm">Enter your password to continue</p>
      </div>

      <!-- Login Form -->
      <div class="bg-white border border-neutral-200 rounded-2xl p-6">
        <form @submit.prevent="onSubmit" class="space-y-5">
          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter password"
              size="lg"
            />
          </UFormField>

          <UButton
            type="submit"
            :loading="loading"
            block
            size="lg"
            class="!bg-black hover:!bg-neutral-800 !text-white font-semibold"
          >
            Sign In
          </UButton>
        </form>
      </div>

      <!-- Back link -->
      <div class="text-center mt-6">
        <NuxtLink to="/" class="text-sm text-neutral-500 hover:text-black transition-colors">
          Back to signup
        </NuxtLink>
      </div>
    </div>
  </div>
</template>