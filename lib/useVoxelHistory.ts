import { useCallback, useRef, useState } from "react";
import { Coord } from "@/lib/voxelStore";

export type OperationType = "CREATE" | "UPDATE_COLOR" | "DELETE" | "DSL_GENERATE";

export type VoxelStatus = {
  coord: Coord[];
  colorId: number | null;
};

type Operation = {
  operationType: OperationType;
  timestamp: number;
  prevStatus: VoxelStatus;
  newStatus: VoxelStatus;
};

export type HistoryCounts = {
  undo: number;
  redo: number;
};

/** Manages capped undo/redo stacks for voxel operations. */
export function useVoxelHistory(maxHistory = 10) {
  const undoStackRef = useRef<Operation[]>([]);
  const redoStackRef = useRef<Operation[]>([]);
  const [counts, setCounts] = useState<HistoryCounts>({ undo: 0, redo: 0 });

  /** Syncs derived undo/redo counters with current stacks. */
  const syncCounts = useCallback(() => {
    setCounts({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length
    });
  }, []);

  /** Checks whether two statuses represent different state. */
  const hasStatusChanged = useCallback((prevStatus: VoxelStatus, newStatus: VoxelStatus): boolean => {
    if (prevStatus.colorId !== newStatus.colorId) {
      return true;
    }
    if (prevStatus.coord.length !== newStatus.coord.length) {
      return true;
    }
    for (let i = 0; i < prevStatus.coord.length; i += 1) {
      const p = prevStatus.coord[i];
      const n = newStatus.coord[i];
      if (p.x !== n.x || p.y !== n.y || p.z !== n.z) {
        return true;
      }
    }
    return false;
  }, []);

  /** Pushes one operation onto the undo stack and clears redo. */
  const recordOperation = useCallback(
    (operationType: OperationType, prevStatus: VoxelStatus, newStatus: VoxelStatus) => {
      if (!hasStatusChanged(prevStatus, newStatus)) {
        return;
      }

      if (undoStackRef.current.length === maxHistory) {
        undoStackRef.current.shift();
      }

      undoStackRef.current.push({
        operationType,
        timestamp: Date.now(),
        prevStatus,
        newStatus
      });

      redoStackRef.current = [];
      syncCounts();
    },
    [maxHistory, syncCounts, hasStatusChanged]
  );

  /** Applies the latest undo operation if available. */
  const undo = useCallback(
    (applyStatus: (status: VoxelStatus) => void): boolean => {
      const operation = undoStackRef.current.pop();
      if (!operation) {
        return false;
      }
      applyStatus(operation.prevStatus);
      redoStackRef.current.push(operation);
      syncCounts();
      return true;
    },
    [syncCounts]
  );

  /** Applies the latest redo operation if available. */
  const redo = useCallback(
    (applyStatus: (status: VoxelStatus) => void): boolean => {
      const operation = redoStackRef.current.pop();
      if (!operation) {
        return false;
      }

      if (undoStackRef.current.length === maxHistory) {
        undoStackRef.current.shift();
      }

      undoStackRef.current.push(operation);
      applyStatus(operation.newStatus);
      syncCounts();
      return true;
    },
    [maxHistory, syncCounts]
  );

  return {
    counts,
    recordOperation,
    undo,
    redo
  };
}
