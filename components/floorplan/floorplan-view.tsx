"use client";

import { useRef, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment } from "@react-three/drei";
import type { CameraControls as CameraControlsImpl } from "@react-three/drei";
import type { Mesh } from "three";
import type { Room, Expense } from "@/lib/types";
import { RoomMesh } from "./room-mesh";
import { RoomPanel } from "./room-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getRoomTotals } from "@/lib/services/settlement";
import { formatCurrency } from "@/lib/utils";

interface FloorplanViewProps {
  rooms: Room[];
  expenses: Expense[];
}

export function FloorplanView({ rooms, expenses }: FloorplanViewProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const meshRefs = useRef<Map<string, Mesh>>(new Map());
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleRoomClick = useCallback(
    async (room: Room) => {
      setSelectedRoom(room);
      const mesh = meshRefs.current.get(room.id);
      const controls = controlsRef.current;
      if (mesh && controls) {
        await controls.fitToBox(mesh, true, {
          paddingLeft: 1.5,
          paddingRight: 1.5,
          paddingBottom: 1.5,
          paddingTop: 1.5,
        });
      }
    },
    []
  );

  const handleBack = useCallback(async () => {
    setSelectedRoom(null);
    const controls = controlsRef.current;
    if (controls) {
      await controls.setLookAt(0, 18, 12, 0, 0, 0, true);
    }
  }, []);

  const roomExpenses = selectedRoom
    ? expenses.filter((e) => e.room_id === selectedRoom.id)
    : [];
  const roomStats = selectedRoom
    ? getRoomTotals(expenses, selectedRoom.id)
    : null;

  return (
    <div className="relative h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <Canvas
        shadows
        camera={{ position: [0, 18, 12], fov: 45 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950"
      >
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <Environment preset="apartment" />
        <CameraControls
          ref={controlsRef}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.2}
          smoothTime={0.9}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {rooms.map((room) => (
          <RoomMesh
            key={room.id}
            room={room}
            selected={selectedRoom?.id === room.id}
            onClick={() => handleRoomClick(room)}
            ref={(mesh) => {
              if (mesh) meshRefs.current.set(room.id, mesh);
            }}
          />
        ))}
      </Canvas>

      {selectedRoom && (
        <>
          <div className="absolute left-4 top-4 z-10">
            <Button variant="secondary" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Wohnung
            </Button>
          </div>
          <RoomPanel
            room={selectedRoom}
            expenses={roomExpenses}
            total={roomStats?.total ?? 0}
            count={roomStats?.count ?? 0}
          />
        </>
      )}

      {!selectedRoom && (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-background/80 px-4 py-2 text-sm backdrop-blur">
          Klicke auf einen Raum, um Ausgaben anzuzeigen
        </div>
      )}
    </div>
  );
}
