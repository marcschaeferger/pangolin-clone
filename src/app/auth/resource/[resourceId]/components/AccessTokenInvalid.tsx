"use client";

import { Button } from "@app/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "@app/components/ui/card";
import Link from "next/link";

export default function AccessTokenInvalid() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                    Acess URL Invalid
                </CardTitle>
            </CardHeader>
            <CardContent>
                This shared access URL is invalid. Please contact the resource
                owner for a new URL.
                <div className="text-center mt-4">
                    <Button>
                        <Link href="/">Go Home</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
