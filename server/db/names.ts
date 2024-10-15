import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the names from the names.json file
const file = join(__dirname, 'names.json');
export const names = JSON.parse(readFileSync(file, 'utf-8'));

export function getUniqueName(): string {
    return (
        names.descriptors[Math.floor(Math.random() * names.descriptors.length)] + "-" +
        names.animals[Math.floor(Math.random() * names.animals.length)]
    ).toLowerCase().replace(/\s/g, '-');
}