"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initParse = void 0;
const babel = require('@babel/core');
const pluginSyntaxJSX = require('@babel/plugin-syntax-jsx');
const pluginSyntaxProposalOptionalChaining = require('@babel/plugin-proposal-optional-chaining');
const pluginSyntaxClassProperties = require('@babel/plugin-syntax-class-properties');
const pluginSyntaxDecorators = require('@babel/plugin-syntax-decorators');
const pluginSyntaxObjectRestSpread = require('@babel/plugin-syntax-object-rest-spread');
const pluginSyntaxAsyncGenerators = require('@babel/plugin-syntax-async-generators');
const pluginSyntaxDoExpressions = require('@babel/plugin-syntax-do-expressions');
const pluginSyntaxDynamicImport = require('@babel/plugin-syntax-dynamic-import');
const pluginSyntaxExportExtensions = require('@babel/plugin-syntax-export-extensions');
const pluginSyntaxFunctionBind = require('@babel/plugin-syntax-function-bind');
function initParse(babelPresets = [], babelPlugins = []) {
    return function (code) {
        return babel.parseSync(code, {
            ast: true,
            configFile: false,
            presets: babelPresets,
            plugins: [
                pluginSyntaxJSX,
                pluginSyntaxProposalOptionalChaining,
                pluginSyntaxClassProperties,
                [pluginSyntaxDecorators, { decoratorsBeforeExport: true }],
                pluginSyntaxObjectRestSpread,
                pluginSyntaxAsyncGenerators,
                pluginSyntaxDoExpressions,
                pluginSyntaxDynamicImport,
                pluginSyntaxExportExtensions,
                pluginSyntaxFunctionBind,
                ...babelPlugins,
            ],
        });
    };
}
exports.initParse = initParse;
