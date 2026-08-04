import type { UsageLog } from "../types/usageLog";
import { IndexedDbRepository } from "./indexedDbRepository";

export const usageLogRepository = new IndexedDbRepository<UsageLog>("usageLogs");
