"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Globe, ShieldCheck, Search, RefreshCw, AlertCircle, Plus, Shield, ShieldOff, ChevronLeft, ChevronRight } from "lucide-react";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { GetUserResourcesResponse } from "@server/routers/resource/getUserResources";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

type Resource = {
    resourceId: number;
    name: string;
    domain: string;
    enabled: boolean;
    protected: boolean;
    protocol: string;
};

type MemberResourcesPortalProps = {
    orgId: string;
};

// Favicon component with fallback
const ResourceFavicon = ({ domain, enabled }: { domain: string; enabled: boolean }) => {
    const [faviconError, setFaviconError] = useState(false);
    const [faviconLoaded, setFaviconLoaded] = useState(false);
    
    // Extract domain for favicon URL
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=32`;
    
    const handleFaviconLoad = () => {
        setFaviconLoaded(true);
        setFaviconError(false);
    };
    
    const handleFaviconError = () => {
        setFaviconError(true);
        setFaviconLoaded(false);
    };

    if (faviconError || !enabled) {
        return <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    }

    return (
        <div className="relative h-4 w-4 flex-shrink-0">
            {!faviconLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse rounded-sm"></div>
            )}
            <img
                src={faviconUrl}
                alt={`${cleanDomain} favicon`}
                className={`h-4 w-4 rounded-sm transition-opacity ${faviconLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleFaviconLoad}
                onError={handleFaviconError}
            />
        </div>
    );
};

// Enhanced status badge component
const StatusBadge = ({ enabled, protected: isProtected }: { enabled: boolean; protected: boolean }) => {
    if (!enabled) {
        return (
            <Badge variant="secondary" className="gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                Disabled
            </Badge>
        );
    }

    if (isProtected) {
        return (
            <Badge variant="secondary" className="gap-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                <ShieldCheck className="h-3 w-3" />
                Protected
            </Badge>
        );
    }

    return (
        <Badge variant="secondary" className="gap-1.5 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
            <ShieldOff className="h-3 w-3" />
            Unprotected
        </Badge>
    );
};

// Pagination component
const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    totalItems,
    itemsPerPage 
}: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            <div className="text-sm text-muted-foreground">
                Showing {startItem}-{endItem} of {totalItems} resources
            </div>
            
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="gap-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and 2 pages around current
                        const showPage = 
                            page === 1 || 
                            page === totalPages || 
                            Math.abs(page - currentPage) <= 1;
                        
                        const showEllipsis = 
                            (page === 2 && currentPage > 4) ||
                            (page === totalPages - 1 && currentPage < totalPages - 3);

                        if (!showPage && !showEllipsis) return null;

                        if (showEllipsis) {
                            return (
                                <span key={page} className="px-2 text-muted-foreground">
                                    ...
                                </span>
                            );
                        }

                        return (
                            <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => onPageChange(page)}
                                className="w-8 h-8 p-0"
                            >
                                {page}
                            </Button>
                        );
                    })}
                </div>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

// Loading skeleton component
const ResourceCardSkeleton = () => (
    <Card className="rounded-lg bg-card text-card-foreground border-2 flex flex-col w-full animate-pulse">
        <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-5 bg-muted rounded w-16"></div>
            </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
            </div>
            <div className="mt-4">
                <div className="h-8 bg-muted rounded w-full"></div>
            </div>
        </CardContent>
    </Card>
);

export default function MemberResourcesPortal({ orgId }: MemberResourcesPortalProps) {
    const t = useTranslations();
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    
    const [resources, setResources] = useState<Resource[]>([]);
    const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("name-asc");
    const [refreshing, setRefreshing] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // 3x4 grid on desktop

    const fetchUserResources = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            
            const response = await api.get<GetUserResourcesResponse>(
                `/org/${orgId}/user-resources`
            );
            
            if (response.data.success) {
                setResources(response.data.data.resources);
                setFilteredResources(response.data.data.resources);
            } else {
                setError("Failed to load resources");
            }
        } catch (err) {
            console.error("Error fetching user resources:", err);
            setError("Failed to load resources. Please check your connection and try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUserResources();
    }, [orgId, api]);

    // Filter and sort resources
    useEffect(() => {
        let filtered = resources.filter(resource =>
            resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.domain.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sort resources
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "domain-asc":
                    return a.domain.localeCompare(b.domain);
                case "domain-desc":
                    return b.domain.localeCompare(a.domain);
                case "status-enabled":
                    // Enabled first, then protected vs unprotected
                    if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
                    return b.protected ? 1 : -1;
                case "status-disabled":
                    // Disabled first, then unprotected vs protected
                    if (a.enabled !== b.enabled) return a.enabled ? 1 : -1;
                    return a.protected ? 1 : -1;
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        setFilteredResources(filtered);
        
        // Reset to first page when search/sort changes
        setCurrentPage(1);
    }, [resources, searchQuery, sortBy]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedResources = filteredResources.slice(startIndex, startIndex + itemsPerPage);

    const handleOpenResource = (resource: Resource) => {
        // Open the resource in a new tab
        window.open(resource.domain, '_blank');
    };

    const handleRefresh = () => {
        fetchUserResources(true);
    };

    const handleRetry = () => {
        fetchUserResources();
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="container mx-auto max-w-12xl">
                <SettingsSectionTitle
                    title="Resources"
                    description="Resources you have access to in this organization"
                />

                {/* Search and Sort Controls - Skeleton */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-start">
                    <div className="relative w-full sm:w-80">
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="w-full sm:w-36">
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                    </div>
                </div>

                {/* Loading Skeletons */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-cols-fr">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <ResourceCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto max-w-12xl">
                <SettingsSectionTitle
                    title="Resources"
                    description="Resources you have access to in this organization"
                />
                <Card className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-6">
                            <AlertCircle className="h-16 w-16 text-destructive/60" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">
                            Unable to Load Resources
                        </h3>
                        <p className="text-muted-foreground max-w-lg text-base mb-6">
                            {error}
                        </p>
                        <Button 
                            onClick={handleRetry}
                            variant="outline"
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-12xl">
            <SettingsSectionTitle
                title="Resources"
                description="Resources you have access to in this organization"
            />

            {/* Search and Sort Controls with Refresh */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex flex-col sm:flex-row gap-4 justify-start flex-1">
                    {/* Search */}
                    <div className="relative w-full sm:w-80">
                        <Input
                            placeholder="Search resources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8"
                        />
                        <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                    
                    {/* Sort */}
                    <div className="w-full sm:w-36">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name-asc">Name A-Z</SelectItem>
                                <SelectItem value="name-desc">Name Z-A</SelectItem>
                                <SelectItem value="domain-asc">Domain A-Z</SelectItem>
                                <SelectItem value="domain-desc">Domain Z-A</SelectItem>
                                <SelectItem value="status-enabled">Enabled First</SelectItem>
                                <SelectItem value="status-disabled">Disabled First</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Refresh Button */}
                <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    disabled={refreshing}
                    className="gap-2 shrink-0"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Resources Content */}
            {filteredResources.length === 0 ? (
                /* Enhanced Empty State */
                <Card className="border-muted/50 bg-muted/5 dark:bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-8 p-4 rounded-full bg-muted/20 dark:bg-muted/30">
                            {searchQuery ? (
                                <Search className="h-12 w-12 text-muted-foreground/70" />
                            ) : (
                                <Globe className="h-12 w-12 text-muted-foreground/70" />
                            )}
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-3">
                            {searchQuery ? "No Resources Found" : "No Resources Available"}
                        </h3>
                        <p className="text-muted-foreground max-w-lg text-base mb-6">
                            {searchQuery 
                                ? `No resources match "${searchQuery}". Try adjusting your search terms or clearing the search to see all resources.`
                                : "You don't have access to any resources yet. Contact your administrator to get access to resources you need."
                            }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {searchQuery ? (
                                <Button 
                                    onClick={() => setSearchQuery("")}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    Clear Search
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleRefresh}
                                    variant="outline"
                                    disabled={refreshing}
                                    className="gap-2"
                                >
                                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh Resources
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Resources Grid */}
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-cols-fr">
                        {paginatedResources.map((resource) => (
                            <Card key={resource.resourceId} className="rounded-lg bg-card text-card-foreground hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 dark:hover:border-primary/30 flex flex-col w-full group">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg font-bold text-foreground truncate mr-2 group-hover:text-primary transition-colors">
                                            {resource.name}
                                        </CardTitle>
                                        <Badge variant="secondary" className="text-xs shrink-0 bg-muted/60 dark:bg-muted/80 text-muted-foreground">
                                            Your Site
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-6 pb-6 flex-1 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        {/* Resource URL with Favicon */}
                                        <div className="flex items-center space-x-2">
                                            <ResourceFavicon domain={resource.domain} enabled={resource.enabled} />
                                            <button
                                                onClick={() => handleOpenResource(resource)}
                                                className="text-sm text-blue-500 dark:text-blue-400 font-medium hover:underline text-left truncate transition-colors hover:text-blue-600 dark:hover:text-blue-300"
                                                disabled={!resource.enabled}
                                            >
                                                {resource.domain.replace(/^https?:\/\//, '')}
                                            </button>
                                        </div>

                                        {/* Enhanced Status Badge */}
                                        <div className="flex items-center">
                                            <StatusBadge enabled={resource.enabled} protected={resource.protected} />
                                        </div>
                                    </div>

                                    {/* Open Resource Button */}
                                    <div className="mt-4">
                                        <Button 
                                            onClick={() => handleOpenResource(resource)}
                                            className="w-full h-8 transition-all group-hover:shadow-sm"
                                            variant="outline"
                                            size="sm"
                                            disabled={!resource.enabled}
                                        >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Open Resource
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={filteredResources.length}
                        itemsPerPage={itemsPerPage}
                    />
                </>
            )}
        </div>
    );
} 