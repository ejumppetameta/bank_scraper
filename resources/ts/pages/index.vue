<script setup lang="ts">
import { ref } from 'vue'

const step = ref(1)
const userConsent = ref(false)
const selectedBank = ref('')
const accessId = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const message = ref('')

const banks = ['PBE Bank', 'XYZ Bank', 'ABC Bank'] // Mock bank list

const nextStep = () => {
  if (step.value === 1 && userConsent.value)
    step.value = 2
  else if (step.value === 2 && selectedBank.value)
    step.value = 3
}

const submitLogin = async () => {
  if (!accessId.value || !password.value) {
    message.value = '❌ Access ID and Password are required!'

    return
  }

  loading.value = true
  message.value = 'Logging in, please wait...'
  console.log(`${selectedBank.value} | ${accessId.value}  | ${password.value}`)

  try {
    const response = await fetch('/api/bank-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank: selectedBank.value,
        access_id: accessId.value,
        password: password.value,
      }),
    })

    const result = await response.json()

    message.value = result.message || '✅ Login successful!'
  }
  catch (error) {
    message.value = '❌ Login failed. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <VRow
    no-gutters
    class="auth-wrapper bg-surface fill-height d-flex align-center justify-center"
  >
    <VCol
      cols="12"
      md="6"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-6"
      >
        <VCardText>
          <h4 class="text-h4 mb-1 text-center">
            Bank Login Portal
          </h4>
          <p class="text-center mb-0">
            Follow the steps below to login to your bank.
          </p>
        </VCardText>
        <!--
          <VCardText v-if="step === 1">
          <p class="text-center">
          Please provide your consent to access your bank account.
          </p>
          </VCardText>
          <VCardActions v-if="step === 1">
          <VBtn
          block
          color="primary"
          @click="nextStep"
          >
          Agree & Continue
          </VBtn>
          </VCardActions>
        -->
        <!-- Consent Step -->
        <VCardText v-if="step === 1">
          <p class="text-center">
            Please provide your consent before proceeding.
          </p>

          <VCheckbox
            v-model="userConsent"
            label="I authorize this platform to access my bank statements for the purpose of verification. My credentials will not be stored and will be deleted after retrieval."
          />
        </VCardText>

        <VCardActions v-if="step === 1">
          <VBtn
            block
            color="primary"
            :disabled="!userConsent"
            @click="nextStep"
          >
            Agree & Continue
          </VBtn>
        </VCardActions>

        <VCardText v-if="step === 2">
          <VForm>
            <VSelect
              v-model="selectedBank"
              label="Select Your Bank"
              :items="banks"
              outlined
              dense
              required
              class="mb-4"
            />
          </VForm>
        </VCardText>
        <VCardActions v-if="step === 2">
          <VBtn
            block
            color="primary"
            @click="nextStep"
          >
            Continue
          </VBtn>
        </VCardActions>

        <VCardText v-if="step === 3">
          <VForm @submit.prevent="submitLogin">
            <VTextField
              v-model="accessId"
              label="Access ID"
              outlined
              dense
              required
              class="mb-4"
            />
            <AppTextField
              v-model="password"
              label="Password"
              placeholder="············"
              class="mb-4"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="password"
              :append-inner-icon="showPassword ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="showPassword = !showPassword"
            />
            <!--
              <VTextField
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              label="Password"
              outlined
              dense
              required
              class="mb-4"
              >
              <template #append-inner>
              <VIcon
              :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              class="cursor-pointer"
              color="white"
              @click="showPassword = !showPassword"
              />
              </template>
              </VTextField>
            -->
            <!--
              <VTextField
              v-model="password"
              label="Password"
              type="password"
              outlined
              dense
              required
              class="mb-4"
              />
            -->
            <VBtn
              block
              color="primary"
              :loading="loading"
              type="submit"
            >
              {{ loading ? "Logging in..." : "Login" }}
            </VBtn>
          </VForm>
        </VCardText>

        <VCardText v-if="message">
          <VAlert
            dense
            class="mt-4"
            :type="message.includes('✅') ? 'success' : 'error'"
          >
            {{ message }}
          </VAlert>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core-scss/template/pages/page-auth";

.fill-height {
  min-block-size: 100vh;
}
</style>
