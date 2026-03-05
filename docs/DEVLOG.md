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
        def _init_(self, colorId, voxel)

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
#### Undo / redo history
- using two stacks
  - Stack1: ops history
  - Stack2: un-redo history
- pseudocode
```python
histories = []
un_redo = []
MAX_HISTORY = 10
class OperationType(Enum):
  CREATE = 1
  UPDATE_COLOR = 2
  DELETE = 3

@dataclass
class Status:
    color: str | None
    block_coordination: tuple

class Operation:
  def _init_(self, operation_type, timestamp, prev_status, new_status):

# called when doing new ops
def add_to_stack(operation_type, new_color):
  if len(history) == MAX_HISTORY: 
    del histories[0]
  prev_color = get_prev_color()
  histories.append(Operation(operation_type, Status(prev_color), Status(new_color)))
  if len(un_redo) != 0: 
    un_redo.clear()
  
def apply(status):
  pt = status.coordination
  color = status.color
  if pt not in blocks:
    # create_new_block(pt, color)
  if color != None:
    # change_color()
  else:
    # delete_block(pt)


def undo():
  if len(history) == 0: 
    # pop up reminder: no more undo steps
    return 
  # pop up top history and add to un_redo
  apply(history[0].prev_status)
  
def redo():
  if len(un_redo) == 0: 
    # pop up reminder: no more undo steps
    return 
  # pop up top history and add to un_redo
  apply(history[0].new_status)

```
#### Save and load scenes (MagicaVoxel has an existing .vox format)
- scene data structure storage
- pseudocode
```Typescript
export type sceneEntity = {
  version: number;
  timestamp: number;
  palette: Map<number, string>;
  entities: Voxel[];

  camera: {
    position: [number, number, number];
    target: [number, number, number];
    zoom?: number;
  };

  


```
#### Generate a voxel structure from a text description, code snippet, or function.
- Support DSL 
  - Format: Geometry color ...size_vars
```python
class VoxelGenerator(ABC):
  @abstractmethod
  def generate(self):
    pass

class BoxGenerator(VoxelGenerator):
  def __init__(self, color, w=10, h=10, d=10):
    self.color = color
    self.w = w
    self.h = h
    self.d = d
  def generate(self):
    voxels = []

    for x in range(self.w):
      for y in range(self.h):
        for z in range(self.d):
          voxels.append(Box((x,y,z), color))
    return voxels

class SphereGenerator(VoxelGenerator):
  def __init__(self, color, r=10):
    self.color = color
    self.r = r
  def generate(self):
    voxels = []

    r = self.r

    for x in range(-r, r + 1):
      for y in range(-r, r + 1):
        for z in range(-r, r + 1):
          if x*x + y*y + z*z <= r*r:
            voxels.append(Box((x,y,z), color))
    return voxels

class PyramidGenerator(VoxelGenerator):
  def __init__(self,color, w=10, h=10, d=10):
    self.color = color
    self.w = w
    self.h = h
    self.d = d
  def generate(self):
    voxels = []
    y1, y2, x1, x2 = 0, self.w, 0, self,h
    for z in range(self.d):
      for y in range(y1,y2+1):
        for z in range(x1,x2+1):
          voxels.append(Box((x,y,z), color))
      y1 += 1
      y2 -= 1
      x1 += 1
      x2 -= 1
    return voxels

voxelByType: Map<type, VoxelGenerator>
def voxelByStr(s):
  ops = s.split(' ')
  type = ops[0]
  if type not in voxelByType: return
  voxelGen = voxelByType[type](ops[1], ops[2:])
  return voxel.generate()
```

#### Performance optimizations
- InstancedMesh + meshBuckets grouped by colorId
- HashMap: 
  - colorById
  - meshByCoordination