"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import api from "@app/api";
import { toast } from "@app/hooks/useToast";
import { useCallback, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@app/components/ui/card";
import CopyTextBox from "@app/components/CopyTextBox";
import { formatAxiosError } from "@app/lib/utils";

type Step = "org" | "site" | "resources";

export default function StepperForm() {
    const [currentStep, setCurrentStep] = useState<Step>("org");
    const [orgName, setOrgName] = useState("");
    const [orgId, setOrgId] = useState("");
    const [siteName, setSiteName] = useState("");
    const [resourceName, setResourceName] = useState("");
    const [orgCreated, setOrgCreated] = useState(false);
    const [orgIdTaken, setOrgIdTaken] = useState(false);

    const checkOrgIdAvailability = useCallback(async (value: string) => {
        try {
            const res = await api.get(`/org/checkId`, {
                params: {
                    orgId: value,
                },
            });
            setOrgIdTaken(res.status !== 404);
        } catch (error) {
            console.error("Error checking org ID availability:", error);
            setOrgIdTaken(false);
        }
    }, []);

    const debouncedCheckOrgIdAvailability = useCallback(
        debounce(checkOrgIdAvailability, 300),
        [checkOrgIdAvailability]
    );

    useEffect(() => {
        if (orgId) {
            debouncedCheckOrgIdAvailability(orgId);
        }
    }, [orgId, debouncedCheckOrgIdAvailability]);

    const showOrgIdError = () => {
        if (orgIdTaken) {
            return (
                <p className="text-sm text-red-500">
                    This ID is already taken. Please choose another.
                </p>
            );
        }
        return null;
    };

    const generateId = (name: string) => {
        return name.toLowerCase().replace(/\s+/g, "-");
    };

    const handleNext = async () => {
        if (currentStep === "org") {
            const res = await api
                .put(`/org`, {
                    orgId: orgId,
                    name: orgName,
                })
                .catch((e) => {
                    toast({
                        variant: "destructive",
                        title: "Error creating org",
                        description: formatAxiosError(e),
                    });
                });

            if (res && res.status === 201) {
                setCurrentStep("site");
                setOrgCreated(true);
            }
        } else if (currentStep === "site") setCurrentStep("resources");
    };

    const handlePrevious = () => {
        if (currentStep === "site") setCurrentStep("org");
        else if (currentStep === "resources") setCurrentStep("site");
    };

    return (
        <>
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Setup Your Environment</CardTitle>
                    <CardDescription>
                        Create your organization, site, and resources.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-8">
                        <div className="flex justify-between mb-2">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                        currentStep === "org"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    1
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        currentStep === "org"
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    Create Org
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                        currentStep === "site"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    2
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        currentStep === "site"
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    Create Site
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                        currentStep === "resources"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    3
                                </div>
                                <span
                                    className={`text-sm font-medium ${
                                        currentStep === "resources"
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    Create Resources
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="flex-1 h-px bg-border"></div>
                            <div className="flex-1 h-px bg-border"></div>
                        </div>
                    </div>
                    {currentStep === "org" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="orgName">
                                    Organization Name
                                </Label>
                                <Input
                                    id="orgName"
                                    value={orgName}
                                    onChange={(e) => {
                                        setOrgName(e.target.value);
                                        setOrgId(generateId(e.target.value));
                                    }}
                                    placeholder="Enter organization name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="orgId">Organization ID</Label>
                                <Input
                                    id="orgId"
                                    value={orgId}
                                    onChange={(e) => setOrgId(e.target.value)}
                                />
                                {showOrgIdError()}
                                <p className="text-sm text-muted-foreground">
                                    This ID is automatically generated from the
                                    organization name and must be unique.
                                </p>
                            </div>
                        </div>
                    )}
                    {currentStep === "site" && (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <Label htmlFor="siteName">Site Name</Label>
                                <Input
                                    id="siteName"
                                    value={siteName}
                                    onChange={(e) =>
                                        setSiteName(e.target.value)
                                    }
                                    placeholder="Enter site name"
                                    required
                                />
                            </div>
                        </div>
                    )}
                    {currentStep === "resources" && (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <Label htmlFor="resourceName">
                                    Resource Name
                                </Label>
                                <Input
                                    id="resourceName"
                                    value={resourceName}
                                    onChange={(e) =>
                                        setResourceName(e.target.value)
                                    }
                                    placeholder="Enter resource name"
                                    required
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={
                                currentStep === "org" ||
                                (currentStep === "site" && orgCreated)
                            }
                        >
                            Previous
                        </Button>
                        <div className="flex items-center space-x-2">
                            {currentStep !== "org" ? (
                                <Link
                                    href={`/${orgId}/settings/sites`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Skip for now
                                </Link>
                            ) : null}

                            <Button
                                type="button"
                                id="button"
                                onClick={handleNext}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
