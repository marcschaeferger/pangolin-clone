"use client";

import React from "react";
import confetti from "canvas-confetti";

export default function SupporterMessage({ tier }: { tier: string }) {
    return (
        <div className="mt-4 text-center">
            <div
                className="relative inline-block px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-md shadow-sm max-w-screen-sm mx-auto cursor-pointer"
                onClick={(e) => {
                    // Get the bounding box of the element
                    const rect = (
                        e.target as HTMLElement
                    ).getBoundingClientRect();

                    // Calculate the origin based on the top center of the box
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: {
                            x: (rect.left + rect.width / 2) / window.innerWidth, // Horizontal center of the box
                            y: rect.top / window.innerHeight // Top of the box
                        }
                    });
                }}
            >
                <h2 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 hover:from-orange-600 hover:via-orange-500 hover:to-orange-400">
                    Thank you for supporting Pangolin as a {tier}!
                </h2>
            </div>
        </div>
    );
}
