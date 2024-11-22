import { useEffect, useRef } from "react";

export const useShakeDetection = (
  acceleration: { x: number; y: number; z: number },
  onShake: () => void
) => {
  const lastAcceleration = useRef(acceleration);
  const shakeThreshold = 15; // Adjust based on testing
  const shakeCooldown = useRef(false);

  useEffect(() => {
    const deltaX = Math.abs(acceleration.x - lastAcceleration.current.x);
    const deltaY = Math.abs(acceleration.y - lastAcceleration.current.y);
    const deltaZ = Math.abs(acceleration.z - lastAcceleration.current.z);

    if (!shakeCooldown.current && deltaX + deltaY + deltaZ > shakeThreshold) {
      shakeCooldown.current = true;
      onShake();

      // Cooldown to prevent multiple triggers
      setTimeout(() => {
        shakeCooldown.current = false;
      }, 500); // 0.5 seconds
    }

    lastAcceleration.current = acceleration;
  }, [acceleration, onShake]);
};
