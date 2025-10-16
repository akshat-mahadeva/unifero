"use client";
import { motion, Easing } from "motion/react";
import React from "react";

export const LoaderOne = () => {
  const transition = (x: number) => {
    return {
      duration: 1,
      repeat: Infinity,
      repeatType: "loop" as const,
      delay: x * 0.2,
      // motion's typing expects Easing or Easing[]; use built-in easing
      ease: "easeInOut" as unknown as Easing,
    };
  };
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{
          y: 0,
        }}
        animate={{
          y: [0, 10, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={transition(0)}
        className="h-2 w-2rounded-full border "
        style={{ background: "var(--color-primary)" }}
      />
      <motion.div
        initial={{
          y: 0,
        }}
        animate={{
          y: [0, 10, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={transition(1)}
        className="h-2 w-2rounded-full border "
        style={{ background: "var(--color-primary)" }}
      />
      <motion.div
        initial={{
          y: 0,
        }}
        animate={{
          y: [0, 10, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={transition(2)}
        className="h-2 w-2rounded-full border"
        style={{ background: "var(--color-primary)" }}
      />
    </div>
  );
};

export const LoaderTwo = () => {
  const transition = (x: number) => {
    return {
      duration: 2,
      repeat: Infinity,
      repeatType: "loop" as const,
      delay: x * 0.2,
      ease: "easeInOut" as unknown as Easing,
    };
  };
  return (
    <div className="flex items-center">
      <motion.div
        transition={transition(0)}
        initial={{
          x: 0,
        }}
        animate={{
          x: [0, 20, 0],
          opacity: [0.4, 1, 0.4],
        }}
        className="h-2 w-2rounded-full shadow-md"
        style={{ background: "var(--color-primary)" }}
      />
      <motion.div
        initial={{
          x: 0,
        }}
        animate={{
          x: [0, 20, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={transition(0.4)}
        className="h-2 w-2-translate-x-2 rounded-full shadow-md"
        style={{ background: "var(--color-primary)" }}
      />
      <motion.div
        initial={{
          x: 0,
        }}
        animate={{
          x: [0, 20, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={transition(0.8)}
        className="h-2 w-2-translate-x-4 rounded-full shadow-md"
        style={{ background: "var(--color-primary)" }}
      />
    </div>
  );
};

export const LoaderThree = () => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-20 w-20 stroke-neutral-500 [--fill-final:var(--color-yellow-300)] [--fill-initial:var(--color-neutral-50)] dark:stroke-neutral-100 dark:[--fill-final:var(--color-yellow-500)] dark:[--fill-initial:var(--color-neutral-800)]"
    >
      <motion.path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <motion.path
        initial={{ pathLength: 0, fill: "var(--fill-initial)" }}
        // animate path length and the fill's opacity using the primary color
        animate={{ pathLength: 1, fill: "color(var(--color-primary) / 1)" }}
        transition={{
          duration: 2,
          // cast easing to satisfy types
          ease: "easeInOut" as unknown as Easing,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"
      />
    </motion.svg>
  );
};

export const LoaderFour = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="relative font-bold text-black [perspective:1000px] dark:text-white">
      <motion.span
        animate={{
          // 'skew' is not a valid motion prop; use 'skewX' for horizontal skew
          skewX: ["0deg", "-40deg", "0deg"],
          scaleX: [1, 2, 1],
        }}
        transition={{
          duration: 0.05,
          repeat: Infinity,
          repeatType: "reverse",
          repeatDelay: 2,
          // cast to satisfy Easing typing
          ease: "linear" as unknown as Easing,
          times: [0, 0.2, 0.5, 0.8, 1],
        }}
        className="relative z-20 inline-block"
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute inset-0 blur-[0.5px]"
        // use primary color with reduced opacity for the glow
        style={{ color: "color(var(--color-primary) / 0.5)" }}
        animate={{
          x: [-2, 4, -3, 1.5, -2],
          y: [-2, 4, -3, 1.5, -2],
          opacity: [0.3, 0.9, 0.4, 0.8, 0.3],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear" as unknown as Easing,
          times: [0, 0.2, 0.5, 0.8, 1],
        }}
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute inset-0"
        // use primary color with slight tint for chroma overlay
        style={{ color: "color(var(--color-primary) / 0.5)" }}
        animate={{
          x: [0, 1, -1.5, 1.5, -1, 0],
          y: [0, -1, 1.5, -0.5, 0],
          opacity: [0.4, 0.8, 0.3, 0.9, 0.4],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear" as unknown as Easing,
          times: [0, 0.3, 0.6, 0.8, 1],
        }}
      >
        {text}
      </motion.span>
    </div>
  );
};

export const LoaderFive = ({ text }: { text: string }) => {
  // set CSS custom property for text-shadow color to the primary color
  const shadowStyle = {
    "--shadow-color": "var(--color-primary)",
  } as React.CSSProperties;

  return (
    <div className="font-sans font-bold" style={shadowStyle}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.1, 1],
            textShadow: [
              "0 0 0 var(--shadow-color)",
              "0 0 1px var(--shadow-color)",
              "0 0 0 var(--shadow-color)",
            ],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "loop",
            delay: i * 0.05,
            ease: "easeInOut" as unknown as Easing,
            repeatDelay: 2,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </div>
  );
};
