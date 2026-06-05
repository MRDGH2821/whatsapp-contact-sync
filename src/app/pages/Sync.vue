<script lang="ts">
import { defineComponent } from "vue";
import { event } from "vue-gtag";
import { EventType, SyncProgress } from "@/contracts/api";
import { enforcePayments } from "../settings";
import { addHandler, sendEvent } from "../services/ws";

interface ManualSyncData {
  existingPhoto: string | null;
  newPhoto: string;
  contactName: string | null;
}

export default defineComponent({
  data: () => ({
    syncProgress: 0,
    syncCount: 0,
    images: [] as string[],
    totalContactsPushed: false,
    errorMessage: undefined as string | undefined,
    lastSyncReceived: null as number | null,
    showCoffeeButton: true,
    isManualSync: false as boolean | undefined,
    isManualSyncLoading: false as boolean | undefined,
    manualSyncData: null as ManualSyncData | null,
  }),
  mounted() {
    addHandler(EventType.SyncProgress, this.onSyncProgress);
    addHandler(EventType.SyncConfirm, this.onSyncConfirm);
    this.initSync();
    setInterval(this.checkServerDisconnected, 5000);
    enforcePayments.then((val) => {
      this.showCoffeeButton = val;
    });
  },
  methods: {
    initSync() {
      fetch(`/api/init_sync${window.location.search}`, { credentials: "include" });
    },
    checkServerDisconnected() {
      this.errorMessage =
        this.lastSyncReceived && this.syncProgress !== 100 && Date.now() - this.lastSyncReceived > 30000
          ? "Server has disconnected. Please refresh the page and restart the process."
          : undefined;
    },
    onSyncProgress(progress: SyncProgress): void {
      if (!this.totalContactsPushed) {
        event("num_contacts_synced", { method: "Google", value: progress.totalContacts });
        this.totalContactsPushed = true;
      }
      this.lastSyncReceived = Date.now();
      this.syncProgress = progress.progress;
      this.syncCount = progress.syncCount;
      this.errorMessage = progress.error;
      this.isManualSync = progress.isManualSync;
      if (progress.image) this.images.push(progress.image);
    },
    onSyncConfirm(data: any): void {
      this.manualSyncData = data;
      this.isManualSyncLoading = false;
    },
    onPhotoConfirm(accept: boolean): void {
      this.isManualSyncLoading = true;
      this.manualSyncData = null;
      sendEvent(EventType.SyncPhotoConfirm, { accept });
    },
  },
});
</script>

<template>
  <div id="home" class="hero h-full bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Sync In Progress</h1>
        <progress class="progress progress-primary w-5/6" :value="syncProgress" max="100"></progress>
      </div>
    </div>
  </div>
</template>
