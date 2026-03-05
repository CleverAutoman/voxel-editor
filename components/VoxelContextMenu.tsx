"use client";

import { Coord } from "@/lib/voxelStore";

export type VoxelContextMenuState = {
  x: number;
  y: number;
  target: Coord;
  canDelete: boolean;
};

type VoxelContextMenuProps = {
  menu: VoxelContextMenuState;
  onPaint: () => void;
  onDelete: () => void;
};

/** Renders the context actions for the currently targeted voxel. */
export default function VoxelContextMenu(props: VoxelContextMenuProps) {
  const { menu, onPaint, onDelete } = props;

  return (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button onClick={onPaint} disabled={!menu.canDelete}>
        Paint voxel with selected color
      </button>
      <button onClick={onDelete} disabled={!menu.canDelete}>
        Delete voxel
      </button>
    </div>
  );
}
