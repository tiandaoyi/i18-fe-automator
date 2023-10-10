"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spreadObject = void 0;
const set_1 = __importDefault(require("lodash/set"));
function spreadObject(obj) {
    const newObject = {};
    Object.keys(obj).forEach((key) => {
        // 中文.中文，存在这种可能性，所以会生成特殊的对象，那么我会判断，如果是存在2个. 或者.在末尾，不分割
        if (key && (key.indexOf('..') !== -1 || key[key.length - 1] === '.')) {
            (0, set_1.default)(newObject, [key], obj[key]);
        }
        else {
            const keyList = key.split('.');
            (0, set_1.default)(newObject, keyList, obj[key]);
        }
    });
    return newObject;
}
exports.spreadObject = spreadObject;
