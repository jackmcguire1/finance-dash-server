import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as admin from "firebase-admin";

declare module "fastify" {
    interface FastifyRequest {
        accountId: string;
    }
}

let app: admin.app.App | undefined;

function getAdminApp(): admin.app.App {
    if (!app) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");

        // When FIREBASE_AUTH_EMULATOR_HOST is set, Admin SDK skips real credential checks
        app = admin.initializeApp({ projectId });
    }
    return app;
}

export async function verifyToken(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return reply.status(401).send({ error: "Missing or invalid Authorization header" });
    }
    const token = header.slice(7);
    try {
        const decoded = await admin.auth(getAdminApp()).verifyIdToken(token);
        req.accountId = decoded.uid;
    } catch {
        return reply.status(401).send({ error: "Invalid or expired token" });
    }
}

export function registerAuthHook(app: FastifyInstance, exemptRoutes: string[]): void {
    app.addHook("preHandler", async (req, reply) => {
        if (exemptRoutes.includes(req.routeOptions.url ?? "")) return;
        await verifyToken(req, reply);
    });
}
