"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const default_config_1 = __importDefault(require("../default.config"));
class StateManager {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {
        this.toolConfig = default_config_1.default;
    }
    static getInstance() {
        if (!this._instance) {
            this._instance = new StateManager();
        }
        return this._instance;
    }
    setToolConfig(config) {
        this.toolConfig = config;
    }
    getToolConfig() {
        return this.toolConfig;
    }
}
exports.default = StateManager.getInstance();
