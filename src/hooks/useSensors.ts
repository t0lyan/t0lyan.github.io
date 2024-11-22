import { useEffect, useState } from "react";

export const useSensors = (tg: any) => {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  useEffect(() => {
    if (!tg) return;

    const handleAcceleration = () => {
      setAcceleration({
        x: tg.Accelerometer.x,
        y: tg.Accelerometer.y,
        z: tg.Accelerometer.z,
      });
    };

    const handleOrientation = () => {
      setOrientation({
        alpha: tg.DeviceOrientation.alpha,
        beta: tg.DeviceOrientation.beta,
        gamma: tg.DeviceOrientation.gamma,
      });
    };

    tg.Accelerometer.start({ refresh_rate: 100 }, (started: boolean) => {
      if (started) {
        tg.onEvent("accelerometer", handleAcceleration);
      } else {
        console.error("Accelerometer not started");
      }
    });

    tg.DeviceOrientation.start({ refresh_rate: 100 }, (started: boolean) => {
      if (started) {
        tg.onEvent("device_orientation", handleOrientation);
      } else {
        console.error("DeviceOrientation not started");
      }
    });

    // Cleanup
    return () => {
      tg.Accelerometer.stop();
      tg.DeviceOrientation.stop();
      tg.offEvent("accelerometer", handleAcceleration);
      tg.offEvent("device_orientation", handleOrientation);
    };
  }, [tg]);

  return { acceleration, orientation };
};
