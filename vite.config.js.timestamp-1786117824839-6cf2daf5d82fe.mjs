// vite.config.js
import { defineConfig } from "file:///C:/Users/ASUS/Desktop/Corior/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ASUS/Desktop/Corior/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/ASUS/Desktop/Corior/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // ── Development server proxy ───────────────────────────
  // In dev, forward /api/* to the backend so you never hit CORS issues
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  // ── Production Build Optimizations ────────────────────
  build: {
    // Output directory (default is 'dist')
    outDir: "dist",
    // Disable source maps in production (prevents code exposure)
    sourcemap: mode !== "production",
    // Minify with esbuild (fastest) in production
    minify: mode === "production" ? "esbuild" : false,
    // Chunk splitting — large vendor libraries go into separate cached chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately, rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI libraries
          "vendor-ui": ["framer-motion", "lucide-react"],
          // State management
          "vendor-state": ["zustand"]
        }
      }
    },
    // Warn when a chunk exceeds 600KB
    chunkSizeWarningLimit: 600,
    // Asset inlining threshold (files < 4KB inlined as base64)
    assetsInlineLimit: 4096
  },
  // ── Preview server (after build) ───────────────────────
  preview: {
    port: 4173,
    strictPort: true
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBU1VTXFxcXERlc2t0b3BcXFxcQ29yaW9yXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBU1VTXFxcXERlc2t0b3BcXFxcQ29yaW9yXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BU1VTL0Rlc2t0b3AvQ29yaW9yL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG5cbiAgLy8gXHUyNTAwXHUyNTAwIERldmVsb3BtZW50IHNlcnZlciBwcm94eSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gSW4gZGV2LCBmb3J3YXJkIC9hcGkvKiB0byB0aGUgYmFja2VuZCBzbyB5b3UgbmV2ZXIgaGl0IENPUlMgaXNzdWVzXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgICAgJy91cGxvYWRzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vIFx1MjUwMFx1MjUwMCBQcm9kdWN0aW9uIEJ1aWxkIE9wdGltaXphdGlvbnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIGJ1aWxkOiB7XG4gICAgLy8gT3V0cHV0IGRpcmVjdG9yeSAoZGVmYXVsdCBpcyAnZGlzdCcpXG4gICAgb3V0RGlyOiAnZGlzdCcsXG5cbiAgICAvLyBEaXNhYmxlIHNvdXJjZSBtYXBzIGluIHByb2R1Y3Rpb24gKHByZXZlbnRzIGNvZGUgZXhwb3N1cmUpXG4gICAgc291cmNlbWFwOiBtb2RlICE9PSAncHJvZHVjdGlvbicsXG5cbiAgICAvLyBNaW5pZnkgd2l0aCBlc2J1aWxkIChmYXN0ZXN0KSBpbiBwcm9kdWN0aW9uXG4gICAgbWluaWZ5OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAnZXNidWlsZCcgOiBmYWxzZSxcblxuICAgIC8vIENodW5rIHNwbGl0dGluZyBcdTIwMTQgbGFyZ2UgdmVuZG9yIGxpYnJhcmllcyBnbyBpbnRvIHNlcGFyYXRlIGNhY2hlZCBjaHVua3NcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gUmVhY3QgY29yZSBcdTIwMTQgY2FjaGVkIHNlcGFyYXRlbHksIHJhcmVseSBjaGFuZ2VzXG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAvLyBVSSBsaWJyYXJpZXNcbiAgICAgICAgICAndmVuZG9yLXVpJzogWydmcmFtZXItbW90aW9uJywgJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICAgIC8vIFN0YXRlIG1hbmFnZW1lbnRcbiAgICAgICAgICAndmVuZG9yLXN0YXRlJzogWyd6dXN0YW5kJ10sXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gV2FybiB3aGVuIGEgY2h1bmsgZXhjZWVkcyA2MDBLQlxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNjAwLFxuXG4gICAgLy8gQXNzZXQgaW5saW5pbmcgdGhyZXNob2xkIChmaWxlcyA8IDRLQiBpbmxpbmVkIGFzIGJhc2U2NClcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NixcbiAgfSxcblxuICAvLyBcdTI1MDBcdTI1MDAgUHJldmlldyBzZXJ2ZXIgKGFmdGVyIGJ1aWxkKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgcHJldmlldzoge1xuICAgIHBvcnQ6IDQxNzMsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgfVxufSkpXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZTLFNBQVMsb0JBQW9CO0FBQzFVLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUd4QixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQUE7QUFBQTtBQUFBLEVBSWhDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxZQUFZO0FBQUEsUUFDVixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLE9BQU87QUFBQTtBQUFBLElBRUwsUUFBUTtBQUFBO0FBQUEsSUFHUixXQUFXLFNBQVM7QUFBQTtBQUFBLElBR3BCLFFBQVEsU0FBUyxlQUFlLFlBQVk7QUFBQTtBQUFBLElBRzVDLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQTtBQUFBLFVBRVosZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBO0FBQUEsVUFFekQsYUFBYSxDQUFDLGlCQUFpQixjQUFjO0FBQUE7QUFBQSxVQUU3QyxnQkFBZ0IsQ0FBQyxTQUFTO0FBQUEsUUFDNUI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSx1QkFBdUI7QUFBQTtBQUFBLElBR3ZCLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUE7QUFBQSxFQUdBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNkO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
