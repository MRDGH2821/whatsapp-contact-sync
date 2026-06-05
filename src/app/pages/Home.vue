<script lang="ts">
import { defineComponent } from "vue";
import { event } from "vue-gtag";
import { SessionStatus } from "@/contracts/api";
import { isWsReady } from "../services/ws";

export default defineComponent({
  data: () => ({
    sessionStatus: undefined as SessionStatus | undefined,
    wsReady: false,
  }),
  mounted() {
    isWsReady.then((val) => {
      this.wsReady = val;
    });
    fetch("/api/status", { credentials: "include" }).then((res) => {
      res.json().then((data) => {
        this.sessionStatus = data;
      });
    });
    event(`host_${window.location.host}`, { method: "Google" });
  },
});
</script>

<template>
  <div id="home" class="hero h-full bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">WhatsApp Contact Sync</h1>
        <p class="py-6">
          This app will sync your contact images from WhatsApp to Google Contacts.
          <br /><br />
          To use this app, you will need to authorize access to your WhatsApp account and to your Google account with contacts permissions.
        </p>
        <router-link to="/contribute" class="btn btn-primary" :class="{ 'btn-disabled': !wsReady }">
          {{ sessionStatus?.whatsappConnected || sessionStatus?.googleConnected ? "Continue" : "Get Started" }}
        </router-link>
      </div>
    </div>
  </div>
</template>
