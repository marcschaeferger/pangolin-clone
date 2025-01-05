"use client";

import React, { useState, useEffect } from "react";
import { Server, Lock, Key, Users, X, ArrowRight } from "lucide-react"; // Replace with actual imports
import { Card, CardContent } from "@app/components/ui/card";
import { Button } from "@app/components/ui/button";

export const ResourcesSplashCard = () => {
    const [isDismissed, setIsDismissed] = useState(false);

    const key = "resources-splash-dismissed";

    useEffect(() => {
        const dismissed = localStorage.getItem(key);
        if (dismissed === "true") {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem(key, "true");
    };

    if (isDismissed) {
        return null;
    }

    return (
        <Card className="w-full mx-auto overflow-hidden mb-8 hidden md:block relative">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-2"
                aria-label="Dismiss"
            >
                <X className="w-5 h-5" />
            </button>
            <CardContent className="grid gap-6 p-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Server className="text-blue-500" />
                        Resources
                    </h3>
                    <p className="text-sm">
                        Resources are proxies to applications running on your private network. Create a resource for any HTTP or HTTPS app on your private network.
                        Each resource must be connected to a site to enable private, secure connectivity through an encrypted WireGuard tunnel.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center gap-2">
                            <Lock className="text-green-500 w-4 h-4" />
                            Secure connectivity with WireGuard encryption
                        </li>
                        <li className="flex items-center gap-2">
                            <Key className="text-yellow-500 w-4 h-4" />
                            Configure multiple authentication methods
                        </li>
                        <li className="flex items-center gap-2">
                            <Users className="text-purple-500 w-4 h-4" />
                            User and role-based access control
                        </li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default ResourcesSplashCard;
