import type { Config } from '../../types';
declare class StateManager {
    private static _instance;
    private constructor();
    private toolConfig;
    static getInstance(): StateManager;
    setToolConfig(config: Config): void;
    getToolConfig(): Config;
}
declare const _default: StateManager;
export default _default;
