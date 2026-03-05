## Voxel Editor


> This project is a browser voxel editor built with Next.js, TypeScript and Three.js (`@react-three/fiber`).


>Additional docs:
> - [AI Threads](docs/AI_THREADS.md): How I use AI in this project
> - [Development Log](docs/DEVLOG.md): Implementation approach and trade-offs
> - [Test Plan](docs/TEST_PLAN.md): Functional test cases

> Vercel Link: https://voxel-editor.vercel.app/
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
- [x] Undo / redo history
  - [X] Undo
  - [X] Redo
  - [x] Support batch Generation
- [x] Save and load scenes
  - [x] Export .vox
  - [x] Import .vox
  - [x] save into JSON
  - [x] load from JSON
  - [x] UI tabs
- [x] Generate a voxel structure from a text description
  - [x] box, pyramid, sphere
- [x] Performance optimizations
  - [x] Color-based rendering groups using `InstancedMesh` for better performance.


- [x] Grid-aligned editing: left click to place, `Shift + left click` to delete.
- [x] Hover preview wireframe that shows the current target voxel cell.
- [x] Two edit target modes:
  - [x] **Add mode**: place at `hitCoord + faceNormal`.
  - [x] **Updating mode**: target the currently hit voxel (`hitCoord`).
- [x] Context menu actions (Paint, Delete) on voxel/ground targets.
- [x] Camera controls: scroll wheel zoom, middle-button drag rotate, right-button drag pan.

--- 

### Run

```bash
npm install
npm test
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000).

---
### Controls
| Action | Input |
|------|------|
| Rotate camera | Middle mouse drag |
| Zoom | Mouse wheel |
| Pan camera | Left / Right mouse drag |
| Place voxel | Left click |
| Remove voxel | Left click + shift |
| Edit voxel | Right click when in UPDATING mode |
| Undo | cmd + z |
| Redo | cmd + shift + z |

#### Toolbar

| Button | Description |
|------|-------------|
| Undo | Reverts the most recent operation |
| Redo | Reapplies the last undone operation |
| Save | Downloads the current scene as `scene.json` |
| Load | Loads a previously saved JSON scene |
| Generate DSL | Generates a shape with predefined grammar |

#### Structure Generation
The editor supports generating structures from predefined shapes.

Available generators:

- **Box**
- **Pyramid**
- **Sphere**

Generated structures are treated as a **single batch operation** and can be undone / redone with one undo / redo step.

---
### Quick Demo

1. Place a few voxels.
2. Change colors using the palette.
3. Generate a sphere.
4. Undo and redo the generation.
5. Save the scene.
6. Reload the page and load the saved file.

### Future Work
- More DSL operations 
  - Support more command types, such as fill, hollow, translate.
- Automated tests for critical flows
  - Add unit tests for voxelDsl parsing/validation and integration tests for undo/redo and save/load.
