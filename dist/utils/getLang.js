"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const stateManager_1 = __importDefault(require("./stateManager"));
function getLang(langPath) {
    const localeFileType = stateManager_1.default.getToolConfig().localeFileType;
    try {
        if (localeFileType === 'json') {
            // json文件直接require拿不到文件内容，故改成下面写法
            const content = fs_extra_1.default.readFileSync(langPath).toString();
            return JSON.parse(content);
        }
        else {
            const content = require(langPath);
            return content;
        }
    }
    catch (_a) {
        return {};
    }
}
exports.default = getLang;
