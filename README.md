# 404 // No Signal

A first-person 3D endless runner inspired by Chrome's offline dinosaur game. Sprint through a monochrome signal tunnel, jump cacti, duck airborne obstacles, and survive as the speed increases.

**Play:** https://isaiahcampusano.github.io/404/

## Play locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal. Use `Space` or `Arrow Up` to jump, and `Arrow Down` or `Ctrl` to duck. Swipe controls and on-screen buttons are available on touch devices.

## Production build

```bash
npm run build
```

The service worker caches the game after its first successful visit so it can be opened offline.
