# TEST_PLAN

---

## 1. Voxel Placement

### Place a voxel ✅

**Steps**

1. Click on an empty grid position.

**Expected Result**

- A voxel appears at the clicked position. 

---

### Remove a voxel ✅

**Steps**

1. Place a voxel.
2. Remove the voxel.

**Expected Result**

- The voxel disappears.

---

### Replace voxel color ✅

**Steps**

1. Place a voxel.
2. Select a different color from the palette.
3. Place another voxel.

**Expected Result**

- The new voxel appears with the selected color.

---

## 2. Camera Navigation

### Rotate camera ✅

**Steps**

1. Drag with the **middle mouse button**.

**Expected Result**

- The camera rotates around the scene.

---

### Zoom camera ✅

**Steps**

1. Scroll the mouse wheel.

**Expected Result**

- The camera zooms in and out within the allowed distance range.

---

### Pan camera ✅

**Steps**

1. Drag with the **left or right mouse button**.

**Expected Result**

- The camera moves horizontally across the scene.

---

## 3. Color Palette

### Select color ✅

**Steps**

1. Click a color in the palette.
2. Place a voxel.

**Expected Result**

- The voxel uses the selected color.

---

### Change color ✅

**Steps**

1. Place a voxel with one color.
2. Change the selected color.
3. Change the voxel to new color.

**Expected Result**

- The voxel appears with the updated color.

---

## 4. Undo / Redo

### Undo placement ✅

**Steps**

1. Place a voxel.
2. Click **Undo**.

**Expected Result**

- The voxel disappears.

---

### Redo placement ✅

**Steps**

1. Place a voxel.
2. Click **Undo**.
3. Click **Redo**.

**Expected Result**

- The voxel reappears.

---

### Undo multiple steps ✅

**Steps**

1. Place several voxels.
2. Click **Undo** multiple times.

**Expected Result**

- Voxels are removed in reverse order of creation.

---

### Redo stack reset ✅

**Steps**

1. Place a voxel.
2. Click **Undo**.
3. Place a new voxel.

**Expected Result**

- The redo history is cleared.
- Clicking **Redo** should not restore the old voxel.

---

## 5. Structure Generation

### Generate square ✅

**Steps**

1. Run the **square generator**.

**Expected Result**

- A square voxel structure appears in the scene.

---

### Generate pyramid ✅

**Steps**

1. Run the **pyramid generator**.

**Expected Result**

- A pyramid voxel structure appears.

---

### Generate sphere ✅

**Steps**

1. Run the **sphere generator**.

**Expected Result**

- A spherical voxel structure appears.

---

### Undo generated structure ✅

**Steps**

1. Generate a structure.
2. Click **Undo**.

**Expected Result**

- The entire generated structure is removed.

---

### Negative length variables are not allowed ✅

**Steps**

1. Generate a structure with negative width

**Expected Result**

- Throw an error to frontend

---

## 6. Save / Load Scene

### Save scene ✅

**Steps**

1. Create a voxel structure.
2. Click **Save**.

**Expected Result**

- A `scene.json` file is downloaded.

---

### Load scene ✅

**Steps**

1. Save a scene.
2. Reload the application.
3. Click **Load** and select the saved JSON file.

**Expected Result**

- The scene is restored exactly as before.

---

### Invalid file handling ✅

**Steps**

1. Attempt to load a non-JSON file.

**Expected Result**

- The application should not crash.
- An error message may be shown.

---

## 7. Performance

### Large voxel count ✅

**Steps**

1. Generate a large structure or place many voxels.

**Expected Result**

- Rendering remains responsive
- Support 1000000~ blocks
