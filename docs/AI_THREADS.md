# AI Threads

AI assisted with:

## evaluating sparse voxel storage vs 3D array

## designing instanced mesh indexing
1. I asked AI how to change my architecture and data structures
2. The trade-off between Mesh and MeshInstance
```Markdown
    ## Data Structure Review

    ### What to Keep

    - **Voxel store keyed by integer coordinates** ✅  
    Use a sparse map keyed by `(x, y, z)` to represent occupied cells in the voxel grid.

    - **Palette map (`colorId -> Color`)** ✅  
    Maintain a palette so voxels reference colors by `colorId` instead of storing full color values.

    - **`hover()` using raycast to get voxel coordinate + face normal** ✅  
    Use raycasting to detect which voxel is intersected and use the face normal to determine placement direction.

    - **Separate data model from renderer** ✅  
    Keep voxel data independent from Three.js rendering objects. The voxel store should be the source of truth.

    ---

    ### What to Change

    #### 1. Drop `CoordinatesByMeshId`

    When using **InstancedMesh**:

    - `hit.object` refers to the **InstancedMesh** (a single mesh containing many instances)
    - `hit.instanceId` identifies **which instance inside that mesh was hit**

    Instead of tracking mesh IDs, maintain mappings such as:

    - `instanceId -> coordKey` (maps an instance back to a voxel coordinate)
    - `coordKey -> instanceId` *(optional but useful for O(1) updates and deletions)*

    ---

    #### 2. `boxByCoordinates` should store data, not Box objects

    Avoid storing geometry objects in the data model.

    Instead store pure voxel data:

    ```ts
        Voxel = { x: number, y: number, z: number, colorId: number }

    ```
````
## debugging raycast placement logic

