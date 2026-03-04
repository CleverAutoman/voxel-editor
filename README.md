## Voxel Editor

This project is a browser voxel editor built with Next.js, TypeScript and Three.js (`@react-three/fiber`).

### Features

- Sparse voxel storage with `Map<string, Voxel>`
- Place block: left click
- Delete block: `Shift + left click`
- Orbit navigation: drag to rotate, wheel to zoom, right click to pan
- Palette-based color selection
- Instanced rendering grouped by `colorId`

### Run

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
