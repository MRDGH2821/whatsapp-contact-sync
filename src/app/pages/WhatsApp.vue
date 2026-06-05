<script lang="ts">
import { defineComponent } from "vue";
import { event } from "vue-gtag";
import { isbot } from "isbot";
import QrcodeVue from "qrcode.vue";
import { EventType } from "@/contracts/api";
import { addHandler } from "../services/ws";

export default defineComponent({
  data: () => ({ qrData: "", qrColorBlack: "#000000", qrColorGray: "oklch(0.961151 0 0)", waCon: false }),
  mounted() {
    addHandler(EventType.WhatsAppQR, this.onQR);
    addHandler(EventType.WhatsAppConnecting, this.onConnecting);
    if (!isbot(navigator.userAgent)) this.initWhatsApp();
  },
  methods: {
    async initWhatsApp() {
      fetch("/api/init_whatsapp", { credentials: "include" });
    },
    onQR(data: string): void {
      if (!this.qrData) event("qr_loaded", { method: "Google" });
      this.qrData = data;
    },
    onConnecting(): void {
      if (!this.waCon) event("whatsapp_connecting", { method: "Google" });
      this.waCon = true;
    },
  },
  components: { QrcodeVue },
});
</script>

<template>
  <div id="home" class="hero h-full bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Authorize WhatsApp</h1>
        <div class="qr-placeholder inline-flex w-72 h-72" v-if="!qrData">
          <button class="center-spinner loading loading-spinner"></button>
        </div>
        <div class="relative z-0">
          <qrcode-vue class="inline-flex qr-code" v-if="qrData" :value="qrData" :size="288" :foreground="waCon ? qrColorGray : qrColorBlack"></qrcode-vue>
        </div>
      </div>
    </div>
  </div>
</template>
