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

const isValidIPAddress = (ip: string) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

export default function ReverseProxyTargets({ params }: { params: { resourceId: string } }) {
    const [targets, setTargets] = useState<ListTargetsResponse["targets"]>([])
    const [nextId, setNextId] = useState(1)
    const [ipError, setIpError] = useState("")

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
        method: "http",
        port: 80,
        protocol: "TCP",
    })

    const addTarget = () => {
        if (!isValidIPAddress(newTarget.ip)) {
            setIpError("Invalid IP address format");
            return;
        }
        setIpError("");

        api.put(`/resource/${params.resourceId}/target`, {
            ...newTarget,
            resourceId: undefined
        })
            .catch((err) => {
                console.error(err)

            }).then((res) => {
                // console.log(res)
                setTargets([...targets, { ...newTarget, targetId: nextId, enabled: true }])
                setNextId(nextId + 1)
                setNewTarget({
                    resourceId: params.resourceId,
                    ip: "",
                    method: "GET",
                    port: 80,
                    protocol: "http",
                })
            });

    }

    const removeTarget = (targetId: number) => {
        api.delete(`/target/${targetId}`)
            .catch((err) => {
                console.error(err)
            }).then((res) => {
                setTargets(targets.filter((target) => target.targetId !== targetId));
            });
    }

    const toggleTarget = (targetId: number) => {
        setTargets(
            targets.map((target) =>
                target.targetId === targetId ? { ...target, enabled: !target.enabled } : target
            )
        )
        api.post(`/target/${targetId}`, { enabled: !targets.find((target) => target.targetId === targetId)?.enabled })
            .catch((err) => {
                console.error(err)
            }).then((res) => {
                console.log(res)
            });

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
                            onChange={(e) => {
                                setNewTarget({ ...newTarget, ip: e.target.value })
                                setIpError("")
                            }}
                            required
                        />
                        {ipError && <p className="text-red-500 text-sm">{ipError}</p>}
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
                                <SelectItem value="http">HTTP</SelectItem>
                                <SelectItem value="https">HTTPS</SelectItem>
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
                                <SelectItem value="UDP">UDP</SelectItem>
                                <SelectItem value="TCP">TCP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button type="submit">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Target
                </Button>
            </form>

            <div className="space-y-4">
                {targets.map((target) => (
                    <Card key={target.targetId} id={`target-${target.targetId}`} className="w-full p-4">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 px-0 pt-0">
                            <CardTitle className="text-lg font-medium flex items-center">
                                <Server className="mr-2 h-5 w-5" />
                                Target {target.targetId}
                            </CardTitle>
                            <div className="flex flex-col items-end space-y-2">
                                <Switch
                                    checked={target.enabled}
                                    onCheckedChange={() => toggleTarget(target.targetId)}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeTarget(target.targetId)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 py-2">
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
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
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}