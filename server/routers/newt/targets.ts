import { Target } from "@server/db/schema";
import { sendToClient } from "../ws";

export async function addTargets(newtId: string, targets: Target[]): Promise<void> {
    //create a list of udp and tcp targets
    const udpTargets = targets
        .filter((target) => target.protocol === "udp")
        .map((target) => {
            return `${target.internalPort ? target.internalPort + ":" : ""}${target.ip}:${target.port}`;
        });

    const tcpTargets = targets
        .filter((target) => target.protocol === "tcp")
        .map((target) => {
            return `${target.internalPort ? target.internalPort + ":" : ""}${target.ip}:${target.port}`;
        });

    if (udpTargets.length > 0) {
        const payload = {
            type: `newt/udp/add`,
            data: {
                targets: udpTargets,
            },
        };
        sendToClient(newtId, payload);
    }

    if (tcpTargets.length > 0) {
        const payload = {
            type: `newt/tcp/add`,
            data: {
                targets: tcpTargets,
            },
        };
        sendToClient(newtId, payload);
    }
}


export async function removeTargets(newtId: string, targets: Target[]): Promise<void> {
    //create a list of udp and tcp targets
    const udpTargets = targets
        .filter((target) => target.protocol === "udp")
        .map((target) => {
            return `${target.internalPort ? target.internalPort + ":" : ""}${target.ip}:${target.port}`;
        });

    const tcpTargets = targets
        .filter((target) => target.protocol === "tcp")
        .map((target) => {
            return `${target.internalPort ? target.internalPort + ":" : ""}${target.ip}:${target.port}`;
        });

    if (udpTargets.length > 0) {
        const payload = {
            type: `newt/udp/remove`,
            data: {
                targets: udpTargets,
            },
        };
        sendToClient(newtId, payload);
    }

    if (tcpTargets.length > 0) {
        const payload = {
            type: `newt/tcp/remove`,
            data: {
                targets: tcpTargets,
            },
        };
        sendToClient(newtId, payload);
    }
}
