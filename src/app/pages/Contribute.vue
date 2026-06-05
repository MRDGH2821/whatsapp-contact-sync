<script lang="ts">
import { defineComponent } from "vue";
import { event } from "vue-gtag";

export default defineComponent({
  data: () => ({
    email: "",
    checkingPurchase: false,
    defaultError: "Failed to verify purchase.",
    waValidationError: "Purchase is valid for a single WhatsApp device only.",
    errorMessage: null as string | null,
  }),
  mounted() {
    if (this.$route.query.show_error) {
      this.errorMessage = this.waValidationError;
      event("contribution_error_shown", { method: "Google" });
    }
  },
  methods: {
    checkPurchase() {
      if (!this.email) return;
      this.checkingPurchase = true;
      fetch("/api/check_purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.purchased) {
            this.$router.push("/whatsapp");
          } else {
            this.errorMessage = this.defaultError;
            this.checkingPurchase = false;
          }
        });
    },
  },
});
</script>

<template>
  <div id="home" class="hero h-full bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Servers Are Expensive</h1>
        <input v-model="email" type="text" class="input input-bordered" placeholder="Email" />
        <div class="mt-2">
          <a @click="checkPurchase()" class="btn btn-primary" :class="{ 'btn-disabled': !email || checkingPurchase }">Continue</a>
        </div>
      </div>
    </div>
  </div>
</template>
