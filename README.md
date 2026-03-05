## Voxel Editor

This project is a browser voxel editor built with Next.js, TypeScript and Three.js (`@react-three/fiber`).

### Features

- [x] 3D voxel grid 
  - [x] Place blocks
  - [x] Remove blocks
- [x] Navigation
  - [x] rotate
  - [x] zoom
  - [x] pan
- [x] Color selection
  - [x] Color palette
  - [x] Color update
- [ ] Undo / redo history
  - [X] Undo
  - [X] Redo
  - [ ] Support batch Generation
- [x] Save and load scenes
  - [x] save into JSON
  - [x] load from JSON
  - [x] UI tabs
- [x] Generate a voxel structure from a text description
  - [x] square, pyramid, sphere
- [x] Performance optimizations
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
