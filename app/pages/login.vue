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
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-bold text-center">Coach Login</h1>
      </template>
      
      <form @submit.prevent="onSubmit" class="space-y-4">
        <UFormField label="Password">
          <UInput v-model="password" type="password" placeholder="Enter admin password" />
        </UFormField>
        
        <UButton type="submit" :loading="loading" block>
          Login
        </UButton>
      </form>
    </UCard>
  </div>
</template>