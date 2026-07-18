import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/session";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints are mounted BEFORE sessionMiddleware so that the
// Replit pid1 startup probe always gets a fast 200, even if the DB connection
// is slow to establish on cold start. The pid1 probes both the service path
// (/api) and the configured startup path (/api/healthz).
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api", (_req, res) => res.json({ status: "ok" }));

app.use(sessionMiddleware);

app.use("/api", router);

// Production error handler — surfaces errors as JSON instead of Express's
// default HTML response so clients always get a parseable error body.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: message });
});

export default app;
