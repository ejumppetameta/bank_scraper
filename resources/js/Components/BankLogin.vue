<script setup lang="ts">
import { ref } from "vue";

const step = ref(1);
const selectedBank = ref("");
const accessId = ref("");
const password = ref("");
const loginResponse = ref(""); // Store API response

const banks = ["JCIM Bank", "XYZ Bank", "ABC Bank"]; // Mock bank list

console.log("✅ Vue Component Loaded!");

const nextStep = () => {
  if (step.value === 1) step.value = 2; // Consent -> Select Bank
  else if (step.value === 2) step.value = 3; // Select Bank -> Enter Credentials
};

const submitLogin = async () => {
  try {
    const response = await fetch("/api/bank-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bank: selectedBank.value,
        access_id: accessId.value,
        password: password.value,
      }),
    });

    if (!response.ok) throw new Error("Failed to login");

    const result = await response.json();
    loginResponse.value = JSON.stringify(result, null, 2); // Store response for display
  } catch (error) {
    loginResponse.value = "Error: " + error.message;
  }
};


</script>


<template>
  <div class="container">
    <div v-if="step === 1">
      <h2>Consent Agreement</h2>
      <p>Please provide your consent to access your bank account.</p>
      <button @click="nextStep">Agree & Continue</button>
    </div>

    <div v-if="step === 2">
      <h2>Select Your Bank</h2>
      <select v-model="selectedBank">
        <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
      </select>
      <button @click="nextStep">Continue</button>
    </div>

    <div v-if="step === 3">
      <h2>Enter Login Credentials</h2>
      <input v-model="accessId" placeholder="Access ID" />
      <input v-model="password" type="password" placeholder="Password" />
      <button @click="submitLogin">Login</button>
    </div>

   
    <div v-if="loginResponse">
      <h3>API Response:</h3>
      <pre>{{ loginResponse }}</pre>
    </div>
  </div>
</template>
