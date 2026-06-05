<script lang="ts">
import { defineComponent } from "vue";
import { EventType } from "@/contracts/api";
import Footer from "./components/Footer.vue";
import Header from "./components/Header.vue";
import { addHandler } from "./services/ws";

export default defineComponent({
  mounted() {
    addHandler(EventType.Redirect, this.onRedirect);
  },
  methods: {
    onRedirect(url: string): void {
      this.$router.push(url);
    },
  },
  components: {
    Header,
    Footer,
  },
});
</script>

<template>
  <div class="flex flex-col h-screen">
    <Header></Header>
    <router-view></router-view>
    <Footer></Footer>
  </div>
</template>
