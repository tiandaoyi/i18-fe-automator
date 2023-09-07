"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeQuotes = void 0;
function escapeQuotes(value) {
    return value.replace(/'/g, '_#_').replace(/"/, '_##_');
}
exports.escapeQuotes = escapeQuotes;
