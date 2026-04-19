import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

/**
 * HoverBorderGradient — Aceternity-style button with an animated gradient border on hover.
 * Uses a rotating conic-gradient that reveals on mouse enter.
 */
export function HoverBorderGradient({
    children,
    containerClassName = "",
    className = "",
    as: Component = "button",
    duration = 1,
    clockwise = true,
    ...props
}) {
    const [hovered, setHovered] = useState(false);
    const [angle, setAngle] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (hovered) {
            intervalRef.current = setInterval(() => {
                setAngle((prev) => (prev + (clockwise ? 4 : -4)) % 360);
            }, 16);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [hovered, clockwise]);

    const gradientStyle = {
        background: hovered
            ? `conic-gradient(from ${angle}deg at 50% 50%, #4ade80, #22d3ee, #a855f7, #ec4899, #4ade80)`
            : "transparent",
    };

    return (
        <Component
            className={`hbg-container ${containerClassName}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...props}
        >
            {/* Animated gradient border layer */}
            <div
                className="hbg-gradient-layer"
                style={gradientStyle}
            />
            {/* Inner content with solid background */}
            <motion.div
                className={`hbg-inner ${className}`}
                animate={{
                    background: hovered
                        ? "linear-gradient(135deg, rgba(17,17,17,1), rgba(25,25,25,1))"
                        : "linear-gradient(135deg, rgba(17,17,17,1), rgba(17,17,17,1))",
                }}
                transition={{ duration: 0.2 }}
            >
                {children}
            </motion.div>
        </Component>
    );
}
