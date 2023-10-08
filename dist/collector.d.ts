import type { CustomizeKey, StringObject } from '../types';
declare class Collector {
    private static _instance;
    private constructor();
    static getInstance(): Collector;
    private keyMap;
    private countOfAdditions;
    private currentFileKeyMap;
    private currentFilePath;
    private keyValueMap;
    setCurrentCollectorPath(path: string): void;
    getCurrentCollectorPath(): string;
    getKeyValueMap(): Record<string, string>;
    clearKeyValueMap(): void;
    add(value: string, customizeKeyFn: CustomizeKey, oldChinese?: string): void;
    getCurrentFileKeyMap(): Record<string, string>;
    resetCurrentFileKeyMap(): void;
    getKeyMap(): StringObject;
    setKeyMap(value: StringObject): void;
    resetCountOfAdditions(): void;
    getCountOfAdditions(): number;
}
export default Collector;
