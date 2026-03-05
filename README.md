## Voxel Editor

This project is a browser voxel editor built with Next.js, TypeScript and Three.js (`@react-three/fiber`).

### Features

- [x] Sparse voxel storage with `Map<string, Voxel>` for efficient add/remove/update.
- [x] Color-based rendering groups using `InstancedMesh` for better performance.
- [x] Grid-aligned editing: left click to place, `Shift + left click` to delete.
- [x] Hover preview wireframe that shows the current target voxel cell.
- [x] Two edit target modes:
  - [x] **Add mode**: place at `hitCoord + faceNormal`.
  - [x] **Updating mode**: target the currently hit voxel (`hitCoord`).
- [x] Context menu actions (Add, Paint, Delete) on voxel/ground targets.
- [x] Camera controls: scroll wheel zoom, middle-button drag rotate, right-button drag pan.


### Run

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
