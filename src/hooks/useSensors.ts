import { useEffect, useState } from "react";

export const useSensors = (tg: any) => {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });
  const [accelerometerAvailable, setAccelerometerAvailable] =
    useState<boolean>(false);
  const [orientationAvailable, setOrientationAvailable] =
    useState<boolean>(false);

  useEffect(() => {
    if (!tg) return;

    // Check if Accelerometer is available
    if (tg.Accelerometer && tg.onEvent) {
      tg.Accelerometer.start({ refresh_rate: 100 }, (started: boolean) => {
        if (started) {
          setAccelerometerAvailable(true);
          tg.onEvent("accelerometerChanged", () => {
            setAcceleration({
              x: tg.Accelerometer.x,
              y: tg.Accelerometer.y,
              z: tg.Accelerometer.z,
            });
          });
        } else {
          console.error("Accelerometer not started");
          setAccelerometerAvailable(false);
        }
      });
    } else {
      console.error("Accelerometer not supported");
      setAccelerometerAvailable(false);
    }

    // Check if DeviceOrientation is available
    if (tg.DeviceOrientation && tg.onEvent) {
      tg.DeviceOrientation.start({ refresh_rate: 100 }, (started: boolean) => {
        if (started) {
          setOrientationAvailable(true);
          tg.onEvent("deviceOrientationChanged", () => {
            setOrientation({
              alpha: tg.DeviceOrientation.alpha,
              beta: tg.DeviceOrientation.beta,
              gamma: tg.DeviceOrientation.gamma,
            });
          });
        } else {
          console.error("DeviceOrientation not started");
          setOrientationAvailable(false);
        }
      });
    } else {
      console.error("DeviceOrientation not supported");
      setOrientationAvailable(false);
    }

    // Cleanup
    return () => {
      if (tg.Accelerometer && tg.Accelerometer.stop) {
        tg.Accelerometer.stop();
      }
      if (tg.DeviceOrientation && tg.DeviceOrientation.stop) {
        tg.DeviceOrientation.stop();
      }
      if (tg.offEvent) {
        tg.offEvent("accelerometerChanged");
        tg.offEvent("deviceOrientationChanged");
      }
    };
  }, [tg]);

  return {
    acceleration,
    orientation,
    accelerometerAvailable,
    orientationAvailable,
  };
};
