import { useEffect, useState } from "react";

export const useSensors = (tg: any) => {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [rotationRate, setRotationRate] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  useEffect(() => {
    if (!tg) return;

    // Start accelerometer tracking
    tg.Accelerometer.start({ refresh_rate: 100 }, (started: boolean) => {
      if (started) {
        tg.onEvent("accelerometer", () => {
          setAcceleration({
            x: tg.Accelerometer.x,
            y: tg.Accelerometer.y,
            z: tg.Accelerometer.z,
          });
        });
      }
    });

    // Start gyroscope tracking
    tg.Gyroscope.start({ refresh_rate: 100 }, (started: boolean) => {
      if (started) {
        tg.onEvent("gyroscope", () => {
          setRotationRate({
            x: tg.Gyroscope.x,
            y: tg.Gyroscope.y,
            z: tg.Gyroscope.z,
          });
        });
      }
    });

    // Start device orientation tracking
    tg.DeviceOrientation.start({ refresh_rate: 100 }, (started: boolean) => {
      if (started) {
        tg.onEvent("device_orientation", () => {
          setOrientation({
            alpha: tg.DeviceOrientation.alpha,
            beta: tg.DeviceOrientation.beta,
            gamma: tg.DeviceOrientation.gamma,
          });
        });
      }
    });

    // Cleanup on unmount
    return () => {
      tg.Accelerometer.stop();
      tg.Gyroscope.stop();
      tg.DeviceOrientation.stop();
    };
  }, [tg]);

  return { acceleration, rotationRate, orientation };
};
