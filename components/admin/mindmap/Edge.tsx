import { memo } from "react";
import { BaseEdge, EdgeProps, getBezierPath } from "reactflow";

export const MindmapEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
  }: EdgeProps) => {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.3,
    });

    return (
      <g>
        {/* Invisible wider path for better interaction */}
        <path
          id={`${id}-interaction`}
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={30} // Increased from 20 to 30 for even easier selection
          style={{
            cursor: "pointer",
            pointerEvents: "stroke",
          }}
        />
        
        {/* Visible edge */}
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: selected ? 4 : 3, // Increased thickness for better visibility
            stroke: selected ? "#3b82f6" : "#64748b", // Darker gray when not selected
            strokeDasharray: "none",
            animation: "none",
            pointerEvents: "none", // Let the interaction path handle events
          }}
        />
        
        {/* Selection indicator */}
        {selected && (
          <path
            d={edgePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={8} // Increased from 6 to 8
            strokeOpacity={0.3}
            style={{
              pointerEvents: "none",
            }}
          />
        )}
      </g>
    );
  }
);

MindmapEdge.displayName = "MindmapEdge";
