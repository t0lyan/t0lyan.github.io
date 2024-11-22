import { useEffect, useRef } from "react";

export const useShakeDetection = (
  acceleration: { x: number; y: number; z: number },
  onShake: () => void,
  isDesktop: boolean
) => {
  const lastAcceleration = useRef(acceleration);
  const shakeThreshold = 15; // Adjust as needed
  const shakeCooldown = useRef(false);

  useEffect(() => {
    if (isDesktop) return; // Skip shake detection on desktop (handled via scroll)
    const deltaX = Math.abs(acceleration.x - lastAcceleration.current.x);
    const deltaY = Math.abs(acceleration.y - lastAcceleration.current.y);
    const deltaZ = Math.abs(acceleration.z - lastAcceleration.current.z);

    if (!shakeCooldown.current && deltaX + deltaY + deltaZ > shakeThreshold) {
      shakeCooldown.current = true;
      onShake();

      setTimeout(() => {
        shakeCooldown.current = false;
      }, 500); // 0.5 seconds cooldown
    }

    lastAcceleration.current = acceleration;
  }, [acceleration, onShake, isDesktop]);
};
