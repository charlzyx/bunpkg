import { defineConfig } from "vocs";

export default defineConfig({
  // baseUrl: "https://charlzyx.github.io/bunpkg/",
  // vite: {
  //   base: "/bunpkg",
  // },
  vite: {
    server: {
      proxy: {
        "/meta": "http://localhost:4567",
      },
    },
  },
  title: "BUNPKG",
  socials: [
    {
      icon: "github",
      link: "https://github.com/charlzyx/bunpkg",
    },
  ],
});
