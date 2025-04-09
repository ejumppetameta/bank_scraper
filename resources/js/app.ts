
import { createApp } from "vue";
import BankLogin from "./Components/BankLogin.vue";

const app = createApp({});
app.component("bank-login", BankLogin);

try {
    app.mount("#app");
    console.log("✅ Vue mounted successfully.");
} catch (error) {
    console.error("❌ Vue mount failed:", error);
}

