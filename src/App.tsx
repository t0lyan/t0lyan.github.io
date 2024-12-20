import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useTelegram } from "./hooks/useTelegram";

const App: React.FC = () => {
  const tg = useTelegram();

  const [globalScore, setGlobalScore] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [shakeAnimation, setShakeAnimation] = useState<boolean>(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(true);

  const [, setIsDesktop] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

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

  // Apply rotations (since orientation data is unavailable, set to zero)
  const rotateX = 0;
  const rotateY = 0;

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

  // Alternative Shake Detection (Desktop and Mobile)
  useEffect(() => {
    let lastDirection: "up" | "down" | null = null;
    let directionChangeCount = 0;

    const handleGesture = (deltaY: number) => {
      const direction = deltaY > 0 ? "down" : "up";

      if (lastDirection && direction !== lastDirection) {
        directionChangeCount += 1;

        if (directionChangeCount >= 2) {
          handleShake();
          directionChangeCount = 0;
        }
      }

      lastDirection = direction;
    };

    // Prevent default scrolling
    const preventDefault = (e: Event) => e.preventDefault();

    // Desktop: Wheel Event
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleGesture(e.deltaY);
    };

    // Mobile: Touch Events
    let touchStartY = 0;
    let lastTouchDirection: "up" | "down" | null = null;
    let touchDirectionChangeCount = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchEndY - touchStartY;
      const direction = deltaY > 0 ? "down" : "up";

      if (lastTouchDirection && direction !== lastTouchDirection) {
        touchDirectionChangeCount += 1;

        if (touchDirectionChangeCount >= 2) {
          handleShake();
          touchDirectionChangeCount = 0;
        }
      }

      lastTouchDirection = direction;
      touchStartY = touchEndY; // Update for continuous movement
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("scroll", preventDefault, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("scroll", preventDefault);
    };
  }, [handleShake]);

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

  // Update debug information
  useEffect(() => {
    setDebugInfo({
      lastDirection: "N/A", // Since we don't have accelerometer data
    });
  }, []);

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
            Swipe up and down rapidly to increase your score!
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
            <path
              d="M3279 9371 c-237 -76 -526 -294 -696 -526 -177 -242 -348 -714 -370
-1024 l-6 -91 1282 0 1281 0 0 49 c0 157 -83 476 -186 719 -100 234 -166 334
-323 493 -186 187 -372 312 -553 373 -119 40 -112 46 -132 -96 -20 -150 -42
-231 -68 -254 -18 -17 -20 -17 -38 2 -25 24 -54 138 -70 272 -12 101 -13 102
-39 101 -14 0 -51 -8 -82 -18z"
            />
            <path
              d="M2210 5480 l0 -2030 88 0 c228 0 524 -94 749 -237 142 -90 320 -250
419 -376 l29 -39 32 44 c115 159 322 332 533 445 167 89 377 150 545 159 55 3
115 7 133 10 l32 5 0 2024 0 2025 -1280 0 -1280 0 0 -2030z"
            />
            <path
              d="M2066 3230 c-354 -45 -664 -212 -885 -476 -405 -485 -424 -1170 -48
-1677 225 -303 557 -491 952 -537 216 -26 487 21 704 122 194 89 412 271 527
438 l52 75 -19 35 c-65 123 -123 320 -144 490 -37 300 2 554 125 824 36 78 35
81 -26 162 -176 232 -390 388 -659 480 -161 56 -419 84 -579 64z"
            />
            <path
              d="M4660 3234 c-252 -29 -442 -94 -620 -210 -84 -55 -236 -179 -265
-216 -6 -7 -31 -38 -56 -68 -66 -77 -151 -216 -192 -313 -183 -424 -141 -902
110 -1287 168 -256 434 -456 723 -543 257 -77 482 -84 735 -21 303 75 567 252
752 501 377 508 357 1189 -48 1676 -247 297 -601 468 -994 481 -60 3 -126 2
-145 0z"
            />{" "}
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
        <p>Debug Info:</p>
        <p>Last Direction: {debugInfo.lastDirection}</p>
        {/* Add more debug info if needed */}
      </div>
    </div>
  );
};

export default App;
