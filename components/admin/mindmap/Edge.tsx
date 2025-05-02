import { memo } from "react";
import { BaseEdge, EdgeProps, getBezierPath } from "reactflow";

export const MindmapEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
  }: EdgeProps) => {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    return (
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: "#94a3b8",
        }}
      />
    );
  }
);

MindmapEdge.displayName = "MindmapEdge";
