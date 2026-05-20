import app from "./app";
import { logger } from "./lib/logger";
import { unstickStaleAnalyses } from "./lib/analyzer";

const port = parseInt(process.env.PORT || "3000", 10);

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});

// Unstick stale analyses every 2 minutes
setInterval(() => {
  unstickStaleAnalyses().catch((err) =>
    logger.error({ err }, "Failed to unstick stale analyses")
  );
}, 2 * 60 * 1000);

export default server;
