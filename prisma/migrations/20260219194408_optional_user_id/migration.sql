-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "report" TEXT,
    "aiProvider" TEXT,
    "riskLevel" TEXT,
    "screenshot" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "userId" TEXT,
    CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Scan" ("aiProvider", "completedAt", "id", "report", "riskLevel", "score", "screenshot", "startedAt", "status", "url", "userId") SELECT "aiProvider", "completedAt", "id", "report", "riskLevel", "score", "screenshot", "startedAt", "status", "url", "userId" FROM "Scan";
DROP TABLE "Scan";
ALTER TABLE "new_Scan" RENAME TO "Scan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
