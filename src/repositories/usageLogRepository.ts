import type { UsageLog } from "../types/usageLog";
import { LocalStorageRepository } from "./localStorageRepository";

export const usageLogRepository = new LocalStorageRepository<UsageLog>("buwangwu.usageLogs");
