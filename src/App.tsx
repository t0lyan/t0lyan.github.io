import React, { useState, useEffect, useCallback } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { useSensors } from "./hooks/useSensors";
import { useShakeDetection } from "./hooks/useShakeDetection";
import { motion } from "framer-motion";
import Confetti from "react-confetti";

const App: React.FC = () => {
  const tg = useTelegram();
  const {
    acceleration,
    orientation,
    accelerometerAvailable,
    orientationAvailable,
  } = useSensors(tg);

  const [globalScore, setGlobalScore] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [shakeAnimation, setShakeAnimation] = useState<boolean>(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(true);

  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // Ensure that tg is ready before proceeding
  useEffect(() => {
    if (!tg) return;

    tg.ready();

    // Expand the Mini App to maximum height
    if (tg.expand) {
      tg.expand();
    }

    // Lock the orientation to the current mode
    if (tg.lockOrientation) {
      tg.lockOrientation();
    }

    // Disable vertical swipes
    if (tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes();
    }

    // Load global score from cloud storage
    tg.CloudStorage.getItem("globalScore", (error: any, value: string) => {
      if (!error && value) {
        setGlobalScore(parseInt(value, 10));
      }
    });

    // Check if first-time user
    tg.CloudStorage.getItem("isFirstTimeUser", (error: any, value: string) => {
      if (!error && value === "false") {
        setIsFirstTimeUser(false);
      } else {
        setIsFirstTimeUser(true);
        tg.CloudStorage.setItem("isFirstTimeUser", "false");
      }
    });

    // Check if desktop
    setIsDesktop(!("ontouchstart" in window));
  }, [tg]);

  const handleShake = useCallback(() => {
    const currentTime = Date.now();

    if (!isSessionActive) {
      setSessionStartTime(currentTime);
      setIsSessionActive(true);
    }

    const sessionDuration = currentTime - (sessionStartTime ?? 0);

    // Check if session is within 20 minutes
    if (sessionDuration <= 20 * 60 * 1000) {
      setSessionScore((prev) => {
        const newSessionScore = prev + 1;
        if (newSessionScore >= 1000) {
          // Session completed
          setIsSessionActive(false);
          startCooldown(sessionDuration);
          // Haptic Feedback
          if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred("success");
          }
        }
        return newSessionScore;
      });

      setGlobalScore((prev) => {
        const newGlobalScore = prev + 1;
        // Update cloud storage
        tg.CloudStorage.setItem("globalScore", newGlobalScore.toString());
        return newGlobalScore;
      });

      // Haptic Feedback
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred("medium");
      }

      // Play sound effect
      playShakeSound();

      setShakeAnimation(true);
    } else {
      // Session time exceeded
      setIsSessionActive(false);
    }
  }, [isSessionActive, sessionStartTime, tg]);

  const startCooldown = (sessionDuration: number) => {
    const remainingTime = Math.max(0, 20 * 60 * 1000 - sessionDuration);
    const waitTime = 10 * 60 * 1000 + remainingTime;
    setCooldownTime(waitTime);

    const cooldownInterval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1000) {
          clearInterval(cooldownInterval);
          setSessionScore(0);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  };

  useShakeDetection(acceleration, handleShake, isDesktop);

  // Handle shake animation reset
  useEffect(() => {
    if (shakeAnimation) {
      const timer = setTimeout(() => setShakeAnimation(false), 300);
      return () => clearTimeout(timer);
    }
  }, [shakeAnimation]);

  // Calculate scales
  const globalScale = 1 + (globalScore / 1_000_000) * 0.5;
  const sessionScale = isSessionActive ? 1 + (sessionScore / 1000) * 0.5 : 1;
  const totalScale = globalScale * sessionScale;

  // Apply rotations
  const rotateX = orientation.beta || 0;
  const rotateY = orientation.gamma || 0;

  // Function to play shake sound effect
  const playShakeSound = () => {
    const audio = new Audio("/sounds/shake.mp3");
    audio.play();
  };

  // Generate random dark gradient background
  const background = `linear-gradient(135deg, #1a1a1a, #333333)`;

  // Leaderboard sharing
  const shareScore = () => {
    if (tg && tg.shareToStory) {
      tg.shareToStory("https://yourgameurl.com", {
        text: `I just scored ${globalScore} points! Can you beat me?`,
      });
    }
  };

  // Desktop: Simulate shaking via scroll or touch
  useEffect(() => {
    if (isDesktop || !accelerometerAvailable) {
      let lastScrollTop = 0;
      const handleScroll = () => {
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const delta = Math.abs(scrollTop - lastScrollTop);
        if (delta > 50) {
          handleShake();
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      };
      window.addEventListener("scroll", handleScroll);

      // Touch swipe detection
      let touchStartY = 0;
      let touchEndY = 0;

      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.changedTouches[0].screenY;
      };

      const handleTouchEnd = (e: TouchEvent) => {
        touchEndY = e.changedTouches[0].screenY;
        const deltaY = Math.abs(touchEndY - touchStartY);
        if (deltaY > 50) {
          handleShake();
        }
      };

      window.addEventListener("touchstart", handleTouchStart);
      window.addEventListener("touchend", handleTouchEnd);

      return () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDesktop, handleShake, accelerometerAvailable]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (tg && tg.unlockOrientation) {
        // Unlock orientation on unmount
        tg.unlockOrientation();
      }
      if (tg && tg.enableVerticalSwipes) {
        tg.enableVerticalSwipes();
      }
    };
  }, [tg]);

  return (
    <div
      className="relative flex items-center justify-center h-screen overflow-hidden"
      style={{
        background,
      }}
    >
      {/* Display scores */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-75 rounded-lg p-4">
        <p className="text-white text-lg font-semibold mb-2">Scores</p>
        <div className="text-white text-sm mb-1">
          Global Score: {globalScore}
        </div>
        <div className="text-white text-sm mb-1">
          Session Score: {sessionScore}
        </div>
        {cooldownTime > 0 && (
          <div className="text-red-500 text-sm">
            Cooldown: {Math.ceil(cooldownTime / 1000)}s
          </div>
        )}
        {/* Share Button */}
        <button
          className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={shareScore}
        >
          Share My Score
        </button>
      </div>

      {/* User Guidance */}
      {isFirstTimeUser && (
        <div className="absolute bottom-10 bg-gray-800 bg-opacity-75 text-white text-center rounded-lg p-4 mx-4">
          <p className="font-semibold">Welcome!</p>
          <p className="text-sm mt-1">
            {accelerometerAvailable
              ? "Shake your phone to increase your score!"
              : "Swipe up and down to increase your score!"}
          </p>
        </div>
      )}

      {/* SVG with motion */}
      <motion.div
        animate={{
          scale: shakeAnimation ? totalScale * 1.1 : totalScale,
          rotateX: rotateX,
          rotateY: rotateY,
        }}
        transition={{ duration: 0.3 }}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Your SVG code goes here */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 695.000000 1008.000000"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="svgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff00cc" />
              <stop offset="100%" stopColor="#333399" />
            </linearGradient>
          </defs>
          <g
            transform="translate(0.000000,1008.000000) scale(0.100000,-0.100000)"
            fill="url(#svgGradient)"
            stroke="none"
          >
            {/* [Your SVG paths go here] */}
          </g>
        </svg>
      </motion.div>

      {/* Progress Indicators */}
      <div className="absolute bottom-4 left-4 right-4 px-4">
        <div className="mb-2">
          <div className="text-white text-sm mb-1">Session Progress</div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full"
              style={{ width: `${(sessionScore / 1000) * 100}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="text-white text-sm mb-1">Global Progress</div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full"
              style={{ width: `${(globalScore / 1_000_000) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Visual Feedback */}
      {sessionScore >= 1000 && <Confetti />}

      {/* Debugging Information */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-75 rounded-lg p-4 text-white text-xs">
        <p>Accelerometer Available: {accelerometerAvailable ? "Yes" : "No"}</p>
        <p>Acceleration:</p>
        <p>X: {acceleration.x.toFixed(2)}</p>
        <p>Y: {acceleration.y.toFixed(2)}</p>
        <p>Z: {acceleration.z.toFixed(2)}</p>
        <p className="mt-2">
          Orientation Available: {orientationAvailable ? "Yes" : "No"}
        </p>
        <p>Orientation:</p>
        <p>Alpha: {orientation.alpha?.toFixed(2)}</p>
        <p>Beta: {orientation.beta?.toFixed(2)}</p>
        <p>Gamma: {orientation.gamma?.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default App;
