# Development Log

> This document shows how I thought, what approach I used, and the trade-offs

## Planning

> Goal: build a browser voxel editor within 48 hours.
> Key priorities:
> 1. 3D voxel grid — place and remove blocks
> 2. Navigation — rotate, zoom, and pan
> 3. Color selection — at minimum a basic palette or color picker
> 4. AI-assisted development

## Architecture
```
User Interaction
      ↓
Voxel State Store
      ↓
3D Renderer
```

## Operations
```
Mouse:
  1. Left Button: Add new block
  2. Middle Button: Rotate view
  3. Wheel: Zoom in & Zoom out
  4. Right Button: Multiple operations includes delete, move, change color
Keyboard:
  1. cmd + z: Undo
  1. cmd + y: Redo
```

## Technological Considerations
### 3D voxel grid 
- Grid
  - Integer voxel coordinates
- Blocks
  - Placement rules
    - Interactions with Grid
  - Voxel storage
    - Create & Delete & Update
### Navigation
- Workspace setup
  - Initial camera position
  - Control limits (zooming or going underground)
- UI
  - Hover highlight 
  - Picking & placement rules
    - Collision/Overlapping with other blocks
  - Switch between input and editing
### Color selection
- Color storage
  - Store full color per voxel v.s. Palette index
  - 
### Stretch Features

## Design & Implementations
### Data Structures

The voxel grid is stored as a sparse hashmap: `Map<string, Voxel>`

Reasons:
- avoids allocating a full 3D array
- O(1) add/remove operations

### Render
Rendering uses InstancedMesh grouped by colorId.

Each group maintains:

- index → voxel coordinate
- voxel coordinate → index

This allows raycast instanceId to be mapped back to voxel coordinates.

```python
    """
    Block ops
    """
    # InstancedMesh 
    class Box:
        def _init_(colorId, voxel)

    # coordinations -> box
    boxByCoordinates : Map<(x, y, z), Box>

    # Track meshId->coordinations, to get box geometry
    CoordinatesByMeshId : Map<int, (x,y,z)>

    """
    Color ops
    """
    colorById: Map<int, Color>

    """
    Groups for rendering
    """
    mesh_groups = []

    def _covert_to_int((x,y,z)):
        return math.floor((x,y,z))

    def _display():
        # get colorId from all mesh_groups
        # render 


    def hover(Raycast) -> Box:
        # raycast -> meshId+normal -> (coordinations)
        _covert_to_int(coordinations)
        # select if present else void

    def create(Raycast):
        box = hover(Raycast)
        # add to maps if not present
        mesh_groups.add(mesh(box))
        _display()

    def delete(Raycast):
        box = hover(Raycast)
        # delete from maps if present
        mesh_groups.delete(mesh(box))
        _display()

    def update(Raycast): # colors, coordinations
        box = hover(Raycast)
        # do nothing if not present
        # update box if change coordinations
        # update mesh if change colors
        _display()
```


### Stretch Features