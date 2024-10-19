"use client"

import { useEffect, useState } from "react"
import { PlusCircle, Trash2, Server, Globe, Cpu, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import api from "@app/api"
import { AxiosResponse } from "axios"
import { ListTargetsResponse } from "@server/routers/target/listTargets"

export default function ReverseProxyTargets({ params }: { params: { resourceId: string } }) {
    const [targets, setTargets] = useState<ListTargetsResponse["targets"]>([])
    const [nextId, setNextId] = useState(1)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const fetchSites = async () => {
                const res = await api.get<AxiosResponse<ListTargetsResponse>>(`/resource/${params.resourceId}/targets`);
                setTargets(res.data.data.targets);
            };
            fetchSites();
        }
    }, []);

    const [newTarget, setNewTarget] = useState({
        resourceId: params.resourceId,
        ip: "",
        method: "GET",
        port: 80,
        protocol: "http",
    })

    const addTarget = async () => {
        const res = await api.put(`/resource/${params.resourceId}/target`, {
            ...newTarget,
            resourceId: undefined
        })
        .catch((err) => {
            console.error(err)
            
        });

        setTargets([...targets, { ...newTarget, targetId: nextId, enabled: true }])
        setNextId(nextId + 1)
        setNewTarget({
            resourceId: params.resourceId,
            ip: "",
            method: "GET",
            port: 80,
            protocol: "http",
        })
    }

    const removeTarget = async (targetId: number) => {
        setTargets(targets.filter((target) => target.targetId !== targetId))
        const res = await api.delete(`/target/${targetId}`)
    }

    const toggleTarget = (targetId: number) => {
        setTargets(
            targets.map((target) =>
                target.targetId === targetId ? { ...target, enabled: !target.enabled } : target
            )
        )
        const res = api.post(`/target/${targetId}`, { enabled: !targets.find((target) => target.targetId === targetId)?.enabled })

        // Add a visual feedback
        const targetElement = document.getElementById(`target-${targetId}`)
        if (targetElement) {
            targetElement.classList.add('scale-105', 'transition-transform')
            setTimeout(() => {
                targetElement.classList.remove('scale-105', 'transition-transform')
            }, 200)
        }
    }

    return (
        <div className="space-y-6">
            {/* <Card>
                <CardHeader> */}
                    {/* <CardTitle>Add New Target</CardTitle>
                </CardHeader>
                <CardContent> */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            addTarget()
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ip">IP Address</Label>
                                <Input
                                    id="ip"
                                    value={newTarget.ip}
                                    onChange={(e) => setNewTarget({ ...newTarget, ip: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="method">Method</Label>
                                <Select
                                    value={newTarget.method}
                                    onValueChange={(value) => setNewTarget({ ...newTarget, method: value })}
                                >
                                    <SelectTrigger id="method">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="DELETE">DELETE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    value={newTarget.port}
                                    onChange={(e) => setNewTarget({ ...newTarget, port: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="protocol">Protocol</Label>
                                <Select
                                    value={newTarget.protocol}
                                    onValueChange={(value) => setNewTarget({ ...newTarget, protocol: value })}
                                >
                                    <SelectTrigger id="protocol">
                                        <SelectValue placeholder="Select protocol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="http">HTTP</SelectItem>
                                        <SelectItem value="https">HTTPS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button type="submit">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Target
                        </Button>
                    </form>
                {/* </CardContent>
            </Card> */}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {targets.map((target) => (
                    <Card key={target.targetId} id={`target-${target.targetId}`} >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <Server className="mr-2 h-4 w-4" />
                                Target {target.targetId}
                            </CardTitle>
                            <Switch
                                checked={target.enabled}
                                onCheckedChange={() => toggleTarget(target.targetId)}
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{target.ip}:{target.port}</span>
                                </div>
                                <div className="flex items-center">
                                    <Cpu className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{target.resourceId}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant={target.enabled ? "default" : "secondary"}>{target.method}</Badge>
                                    <Badge variant={target.enabled ? "default" : "secondary"}>{target.protocol?.toUpperCase()}</Badge>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="mt-4 w-full"
                                onClick={() => removeTarget(target.targetId)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}