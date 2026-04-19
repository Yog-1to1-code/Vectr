import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * StatefulButton — Aceternity-style button with idle → loading → success states.
 * When onClick returns a promise, the button shows a spinner then a checkmark.
 */
export function Button({
    children,
    onClick,
    disabled = false,
    className = "",
    type = "button",
    ...buttonProps
}) {
    const [status, setStatus] = useState("idle"); // idle | loading | success

    const handleClick = useCallback(
        async (e) => {
            if (status !== "idle" || disabled) return;
            setStatus("loading");
            try {
                const result = onClick?.(e);
                if (result instanceof Promise) {
                    await result;
                }
                setStatus("success");
                setTimeout(() => setStatus("idle"), 2000);
            } catch {
                setStatus("idle");
            }
        },
        [onClick, status, disabled]
    );

    return (
        <motion.button
            type={type}
            disabled={disabled || status !== "idle"}
            onClick={handleClick}
            className={`stateful-btn ${status !== "idle" ? "stateful-btn-active" : ""} ${className}`}
            whileTap={{ scale: status === "idle" ? 0.96 : 1 }}
            {...buttonProps}
        >
            <AnimatePresence mode="wait">
                {status === "idle" && (
                    <motion.span
                        key="idle"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="stateful-btn-content"
                    >
                        {children}
                    </motion.span>
                )}

                {status === "loading" && (
                    <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="stateful-btn-content"
                    >
                        <svg
                            className="stateful-spinner"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        >
                            <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        <span>Processing...</span>
                    </motion.span>
                )}

                {status === "success" && (
                    <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.25, type: "spring", stiffness: 200 }}
                        className="stateful-btn-content"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Done!</span>
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
