<script lang="ts">
// @ts-nocheck
import { defineComponent } from "vue";
import { event } from "vue-gtag";

export default defineComponent({
  data: () => ({
    CLIENT_ID: import.meta.env.WEB_GOOGLE_CLIENT_ID,
    API_KEY: import.meta.env.WEB_GOOGLE_API_KEY,
    gisLoaded: false,
    gapiLoaded: false,
    tokenClient: undefined as any,
  }),
  mounted() {
    this.addJSSrc("https://accounts.google.com/gsi/client", this.onGisLoaded);
    this.addJSSrc("https://apis.google.com/js/api.js", this.onGapiLoaded);
  },
  methods: {
    addJSSrc(url: string, onLoad: () => void = () => {}) {
      const el = document.createElement("script");
      el.src = url;
      el.onload = onLoad;
      el.setAttribute("async", "");
      el.setAttribute("defer", "");
      document.head.appendChild(el);
    },
    onGisLoaded() {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: "https://www.googleapis.com/auth/contacts",
        callback: this.onSignIn,
      });
      this.gisLoaded = true;
    },
    async onGapiLoaded() {
      gapi.load("client", this.initGapiClient);
      this.gapiLoaded = true;
    },
    async initGapiClient() {
      await gapi.client.init({
        apiKey: this.API_KEY,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/people/v1/rest"],
      });
    },
    handleAuthClick() {
      this.tokenClient.requestAccessToken({ prompt: "consent" });
    },
    async onSignIn(resp: any) {
      if (resp.error !== undefined) throw resp;
      event("google_authorized", { method: "Google" });
      const token = gapi.client.getToken();
      fetch("/api/init_gapi", {
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (res.status === 200) {
          const url = new URL(res.url);
          this.$router.push(url.pathname);
        } else {
          throw res;
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
        <h1 class="text-5xl font-bold">Authorize Google</h1>
        <button @click="handleAuthClick" :disabled="!gapiLoaded && !gisLoaded" id="signin-button" class="btn btn-outline btn-primary gap-4">
          <img class="w-8" alt="Google login" src="/google_logo.svg" />Sign in with Google
        </button>
      </div>
    </div>
  </div>
</template>
