import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import MySvg from "./assets/mySvg.svg";
import { useSensors } from "./hooks/useSensors";
import { useShakeDetection } from "./hooks/useShakeDetection";
import { useTelegram } from "./hooks/useTelegram";

const App: React.FC = () => {
  const tg = useTelegram();
  const { acceleration, orientation } = useSensors(tg);

  const [globalScore, setGlobalScore] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [shakeAnimation, setShakeAnimation] = useState<boolean>(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(true);

  // Load global score from cloud storage
  useEffect(() => {
    if (!tg) return;
    tg.ready();

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
  }, [tg]);

  const handleShake = () => {
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
          tg.HapticFeedback.notificationOccurred("success");
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
      tg.HapticFeedback.impactOccurred("medium");

      // Play sound effect
      playShakeSound();

      setShakeAnimation(true);
    } else {
      // Session time exceeded
      setIsSessionActive(false);
    }
  };

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

  useShakeDetection(acceleration, handleShake);

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

  // Animated background
  const [backgroundPosition, setBackgroundPosition] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundPosition((prev) => prev + 0.5);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Leaderboard sharing
  const shareScore = () => {
    if (tg) {
      tg.shareToStory("https://yourgameurl.com", {
        text: `I just scored ${globalScore} points! Can you beat me?`,
      });
    }
  };

  return (
    <div
      className="relative flex items-center justify-center h-screen overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a1a1a, #333333)",
        backgroundPosition: `${backgroundPosition}%`,
        backgroundSize: "200% 200%",
        transition: "background-position 0.5s",
      }}
    >
      {/* Display scores */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-75 rounded-lg p-4">
        <p className="text-white text-lg">Global Score: {globalScore}</p>
        <p className="text-white text-lg">Session Score: {sessionScore}</p>
        {cooldownTime > 0 && (
          <p className="text-red-500 text-lg">
            Cooldown: {Math.ceil(cooldownTime / 1000)}s
          </p>
        )}
        {/* Share Button */}
        <button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={shareScore}
        >
          Share Score
        </button>
      </div>

      {/* User Guidance */}
      {isFirstTimeUser && (
        <div className="absolute bottom-10 bg-gray-800 bg-opacity-75 text-white text-center rounded-lg p-4">
          Shake your phone to increase your score!
        </div>
      )}

      {/* SVG with motion */}
      <motion.img
        src={MySvg}
        alt="Interactive SVG"
        animate={{
          scale: shakeAnimation ? totalScale * 1.1 : totalScale,
          rotateX: rotateX,
          rotateY: rotateY,
        }}
        transition={{ duration: 0.3 }}
        style={{
          width: "200px",
          height: "auto",
          transformStyle: "preserve-3d",
        }}
      />

      {/* Progress Indicators */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${(sessionScore / 1000) * 100}%` }}
          ></div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${(globalScore / 1_000_000) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Visual Feedback */}
      {sessionScore >= 1000 && <Confetti />}

      {/* Sound Effects */}
      <audio id="shake-sound" src="/sounds/shake.mp3" preload="auto"></audio>
    </div>
  );
};

export default App;
