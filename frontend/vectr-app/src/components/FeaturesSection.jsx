import React from "react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import WorldMap from "./ui/world-map";

/**
 * Features section adapted from Aceternity UI, customized for Vectr.
 * Shows on the right side of the login page.
 */
export default function FeaturesSection() {
    const features = [
        {
            title: "AI-Powered Issue Discovery",
            description:
                "Find the perfect open source issues matched to your skill level using Amazon Nova AI.",
            skeleton: <SkeletonOne />,
            className:
                "col-span-1 lg:col-span-4 border-b lg:border-r border-[#1e1e1e]",
        },
        {
            title: "Smart Code Guidance",
            description:
                "Get AI-driven walkthroughs, summaries, and testing steps for every issue.",
            skeleton: <SkeletonTwo />,
            className: "border-b col-span-1 lg:col-span-2 border-[#1e1e1e]",
        },
        {
            title: "Auto Draft PRs",
            description:
                "Generate pull request drafts with AI-assisted diffs and commit analysis.",
            skeleton: <SkeletonThree />,
            className:
                "col-span-1 lg:col-span-3 lg:border-r border-[#1e1e1e]",
        },
        {
            title: "Global Open Source Impact",
            description:
                "Join thousands of developers contributing to projects around the world with Vectr.",
            skeleton: <SkeletonFour />,
            className: "col-span-1 lg:col-span-3 border-b lg:border-none",
        },
    ];

    return (
        <div className="features-section">
            <div className="features-header">
                <h4 className="features-title">
                    Everything you need to contribute
                </h4>
                <p className="features-subtitle">
                    From AI-powered issue matching to automated PR drafts, Vectr
                    streamlines your open source journey end-to-end.
                </p>
            </div>
            <div className="features-grid-wrapper">
                <div className="features-grid">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} className={feature.className}>
                            <FeatureTitle>{feature.title}</FeatureTitle>
                            <FeatureDescription>{feature.description}</FeatureDescription>
                            <div className="feature-skeleton-wrapper">{feature.skeleton}</div>
                        </FeatureCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

const FeatureCard = ({ children, className }) => {
    return (
        <div className={cn("feature-card", className)}>
            {children}
        </div>
    );
};

const FeatureTitle = ({ children }) => {
    return <p className="feature-title">{children}</p>;
};

const FeatureDescription = ({ children }) => {
    return <p className="feature-description">{children}</p>;
};

/* ─── Skeleton One: Dashboard Preview ─────────────────────────────── */
const SkeletonOne = () => {
    return (
        <div className="skeleton-one">
            <div className="skeleton-one-card">
                <div className="skeleton-one-inner">
                    <img
                        src="/feature-dashboard.png"
                        alt="Vectr dashboard preview"
                        width={800}
                        height={800}
                        className="skeleton-one-img"
                    />
                </div>
            </div>
            <div className="skeleton-fade-bottom" />
            <div className="skeleton-fade-top" />
        </div>
    );
};

/* ─── Skeleton Two: Stacked Language/Tech cards ───────────────────── */
const SkeletonTwo = () => {
    const techs = [
        { name: "Python", color: "#3572A5" },
        { name: "JavaScript", color: "#f1e05a" },
        { name: "TypeScript", color: "#3178c6" },
        { name: "Rust", color: "#dea584" },
        { name: "Go", color: "#00ADD8" },
    ];

    const cardVariants = {
        whileHover: {
            scale: 1.1,
            rotate: 0,
            zIndex: 100,
        },
        whileTap: {
            scale: 1.1,
            rotate: 0,
            zIndex: 100,
        },
    };

    return (
        <div className="skeleton-two">
            <div className="skeleton-two-row">
                {techs.map((tech, idx) => (
                    <motion.div
                        variants={cardVariants}
                        key={"tech-" + idx}
                        style={{ rotate: Math.random() * 20 - 10 }}
                        whileHover="whileHover"
                        whileTap="whileTap"
                        className="skeleton-two-card"
                    >
                        <div className="skeleton-two-card-inner">
                            <span
                                className="skeleton-two-dot"
                                style={{ background: tech.color }}
                            />
                            <span className="skeleton-two-name">{tech.name}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="skeleton-two-row" style={{ marginLeft: "-20px" }}>
                {["C++", "Ruby", "Java", "Kotlin", "Swift"].map((name, idx) => (
                    <motion.div
                        key={"tech-2-" + idx}
                        style={{ rotate: Math.random() * 20 - 10 }}
                        variants={cardVariants}
                        whileHover="whileHover"
                        whileTap="whileTap"
                        className="skeleton-two-card"
                    >
                        <div className="skeleton-two-card-inner">
                            <span
                                className="skeleton-two-dot"
                                style={{ background: ["#f34b7d", "#701516", "#b07219", "#A97BFF", "#F05138"][idx] }}
                            />
                            <span className="skeleton-two-name">{name}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
            <div className="skeleton-two-fade-left" />
            <div className="skeleton-two-fade-right" />
        </div>
    );
};

/* ─── Skeleton Three: PR diff preview ─────────────────────────────── */
const SkeletonThree = () => {
    return (
        <div className="skeleton-three">
            <div className="skeleton-three-inner">
                {/* Fake diff block */}
                <div className="skeleton-diff">
                    <div className="skeleton-diff-header">
                        <span className="skeleton-diff-filename">src/utils/helper.js</span>
                        <span className="skeleton-diff-badge">+42 −8</span>
                    </div>
                    <div className="skeleton-diff-body">
                        <div className="skeleton-diff-line skeleton-diff-context">
                            <span className="skeleton-diff-ln">14</span>
                            <span>{"  const result = [];"}</span>
                        </div>
                        <div className="skeleton-diff-line skeleton-diff-remove">
                            <span className="skeleton-diff-ln">15</span>
                            <span>{"- for (let i = 0; i < arr.length; i++) {"}</span>
                        </div>
                        <div className="skeleton-diff-line skeleton-diff-add">
                            <span className="skeleton-diff-ln">15</span>
                            <span>{"+ arr.forEach((item, i) => {"}</span>
                        </div>
                        <div className="skeleton-diff-line skeleton-diff-add">
                            <span className="skeleton-diff-ln">16</span>
                            <span>{"+ if (item.isValid) {"}</span>
                        </div>
                        <div className="skeleton-diff-line skeleton-diff-context">
                            <span className="skeleton-diff-ln">17</span>
                            <span>{"    result.push(transform(item));"}</span>
                        </div>
                        <div className="skeleton-diff-line skeleton-diff-add">
                            <span className="skeleton-diff-ln">18</span>
                            <span>{"+ }"}</span>
                        </div>
                        <div className="skeleton-diff-line skeleton-diff-context">
                            <span className="skeleton-diff-ln">19</span>
                            <span>{"  });"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Skeleton Four: World Map ────────────────────────────────────── */
const SkeletonFour = () => {
    return (
        <div className="skeleton-four">
            <WorldMap
                lineColor="#4ade80"
                dots={[
                    {
                        start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
                        end: { lat: 34.0522, lng: -118.2437 },   // Los Angeles
                    },
                    {
                        start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
                        end: { lat: -15.7975, lng: -47.8919 },   // Brazil (Brasília)
                    },
                    {
                        start: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
                        end: { lat: 38.7223, lng: -9.1393 },     // Lisbon
                    },
                    {
                        start: { lat: 51.5074, lng: -0.1278 },   // London
                        end: { lat: 28.6139, lng: 77.209 },      // New Delhi
                    },
                    {
                        start: { lat: 28.6139, lng: 77.209 },    // New Delhi
                        end: { lat: 43.1332, lng: 131.9113 },    // Vladivostok
                    },
                    {
                        start: { lat: 28.6139, lng: 77.209 },    // New Delhi
                        end: { lat: -1.2921, lng: 36.8219 },     // Nairobi
                    },
                ]}
            />
        </div>
    );
};

