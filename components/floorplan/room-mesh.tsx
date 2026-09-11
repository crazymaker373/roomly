"use client";

import { forwardRef } from "react";
import { Text } from "@react-three/drei";
import type { Room } from "@/lib/types";
import * as THREE from "three";

interface RoomMeshProps {
  room: Room;
  selected: boolean;
  onClick: () => void;
}

export const RoomMesh = forwardRef<THREE.Mesh, RoomMeshProps>(
  ({ room, selected, onClick }, ref) => {
    const height = 0.3;
    const x = room.position_x;
    const z = room.position_y;
    const width = room.size_x;
    const depth = room.size_y;

    return (
      <group position={[x, 0, z]}>
        <mesh
          ref={ref}
          position={[0, height / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={room.color}
            transparent
            opacity={selected ? 0.95 : 0.75}
            emissive={selected ? room.color : "#000000"}
            emissiveIntensity={selected ? 0.3 : 0}
          />
        </mesh>
        <Text
          position={[0, height + 0.3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {room.name}
        </Text>
      </group>
    );
  }
);
RoomMesh.displayName = "RoomMesh";
