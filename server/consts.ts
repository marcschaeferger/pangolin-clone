import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

export const __FILENAME = fileURLToPath(import.meta.url);
export const __DIRNAME = path.dirname(__FILENAME);

export const APP_PATH = path.join("config");
