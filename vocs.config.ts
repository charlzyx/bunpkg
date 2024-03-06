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
        "/npm": "http://localhost:4567",
        "/esm": "http://localhost:4567",
      },
    },
  },
  title: "BUNPKG",
  logoUrl: "https://r2.charlzyx.xyz/bunpkg.svg",
  socials: [
    {
      icon: "github",
      link: "https://github.com/charlzyx/bunpkg",
    },
  ],
});
