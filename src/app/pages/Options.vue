<script lang="ts">
import { defineComponent } from "vue";

interface Option {
  title: string;
  description: string;
  target: string;
  value: boolean;
  onChange?: (options: Option[]) => (event: Event) => void;
}

const disableOtherOptionsOnChange = (target: string) => (options: Option[]) => (event: Event) => {
  const checkbox = event.target as HTMLInputElement;
  if (checkbox.checked) {
    options.filter((o) => o.target !== target).forEach((o) => (o.value = false));
  }
};

export default defineComponent({
  data: () => ({
    options: [
      {
        title: "Manual Sync",
        description: "If enabled, each photo can be compared and selected manually.",
        target: "manual_sync",
        value: false,
        onChange: disableOtherOptionsOnChange("manual_sync"),
      },
      {
        title: "Overwrite existing images",
        description: "If enabled, existing contact images will be overwritten.",
        target: "overwrite_photos",
        value: false,
        onChange: disableOtherOptionsOnChange("overwrite_photos"),
      },
    ] as Option[],
  }),
  methods: {
    startSync() {
      const searchParams = new URLSearchParams();
      this.options.forEach((option) => {
        searchParams.set(option.target, String(option.value));
      });
      this.$router.push(`/sync?${searchParams.toString()}`);
    },
  },
});
</script>

<template>
  <div id="home" class="hero h-full bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Sync Options</h1>
        <div class="pt-6">
          <button class="btn btn-primary px-8" @click="startSync()">Start Sync</button>
        </div>
      </div>
    </div>
  </div>
</template>
