const app = require("./app");
const PORT = process.env.PORT || 3000;
const prisma = require("./lib/prisma");
const logger = require("./lib/logger");

app.listen(PORT, () => {
  logger.info({port: PORT}, `Server running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

