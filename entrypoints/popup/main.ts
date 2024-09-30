import "primeicons/primeicons.css";
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import Button from "primevue/button";
import { PrimeVue } from "@primevue/core";
import Aura from "@primevue/themes/aura";
import Avatar from "primevue/avatar";

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});
app.component("Button", Button);
app.component("Avatar", Avatar);
app.mount("#app");
