"use client";

import React from "react";
import confetti from "canvas-confetti";

export default function SupporterMessage({ tier }: { tier: string }) {
    return (
        <div className="relative flex items-center space-x-2 whitespace-nowrap group">
            <span
                className="cursor-pointer"
                onClick={(e) => {
                    // Get the bounding box of the element
                    const rect = (
                        e.target as HTMLElement
                    ).getBoundingClientRect();

                    // Trigger confetti centered on the word "Pangolin"
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: {
                            x: (rect.left + rect.width / 2) / window.innerWidth,
                            y: rect.top / window.innerHeight
                        },
                        colors: ["#FFA500", "#FF4500", "#FFD700"]
                    });
                }}
            >
                Pangolin
            </span>
            {/* SVG Star */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-4 h-4 text-primary"
            >
                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.782 1.4 8.168L12 18.896l-7.334 3.864 1.4-8.168L.132 9.21l8.2-1.192z" />
            </svg>
            {/* Popover */}
            <div className="absolute left-1/2 transform -translate-x-1/2 -top-10 hidden group-hover:block bg-white/10 text-primary text-sm rounded-md shadow-lg px-4 py-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Thank you for supporting Pangolin as a {tier}!
            </div>
        </div>
    );
}
