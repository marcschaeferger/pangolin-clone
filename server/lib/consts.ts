import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

export const __FILENAME = fileURLToPath(import.meta.url);
export const __DIRNAME = path.dirname(__FILENAME);

export const APP_PATH = path.join("config");

export const configFilePath1 = path.join(APP_PATH, "config.yml");
export const configFilePath2 = path.join(APP_PATH, "config.yaml");
