"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const traverse_1 = __importDefault(require("@babel/traverse"));
const generator_1 = __importDefault(require("@babel/generator"));
const template_1 = __importDefault(require("@babel/template"));
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const collector_1 = __importDefault(require("./collector"));
const includeChinese_1 = require("./utils/includeChinese");
const assertType_1 = require("./utils/assertType");
const escapeQuotes_1 = require("./utils/escapeQuotes");
const constants_1 = require("./utils/constants");
const stateManager_1 = __importDefault(require("./utils/stateManager"));
const removeLineBreaksInTag_1 = require("./utils/removeLineBreaksInTag");
const t = require('@babel/types');
function getObjectExpression(obj) {
    const ObjectPropertyArr = [];
    Object.keys(obj).forEach((k) => {
        const tempValue = obj[k];
        let newValue;
        if ((0, assertType_1.isObject)(tempValue)) {
            newValue = tempValue.value;
        }
        else {
            newValue = t.identifier(tempValue);
        }
        ObjectPropertyArr.push(t.objectProperty(t.identifier(k), newValue));
    });
    const ast = t.objectExpression(ObjectPropertyArr);
    return ast;
}
// 判断节点是否是props属性的默认值
function isPropNode(path) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const objWithProps = (_d = (_c = (_b = (_a = path.parentPath) === null || _a === void 0 ? void 0 : _a.parentPath) === null || _b === void 0 ? void 0 : _b.parentPath) === null || _c === void 0 ? void 0 : _c.parentPath) === null || _d === void 0 ? void 0 : _d.parent;
    const rootNode = (_k = (_j = (_h = (_g = (_f = (_e = path.parentPath) === null || _e === void 0 ? void 0 : _e.parentPath) === null || _f === void 0 ? void 0 : _f.parentPath) === null || _g === void 0 ? void 0 : _g.parentPath) === null || _h === void 0 ? void 0 : _h.parentPath) === null || _j === void 0 ? void 0 : _j.parentPath) === null || _k === void 0 ? void 0 : _k.parent;
    let isMeetProp = false;
    let isMeetKey = false;
    let isMeetContainer = false;
    // 属性是否包含在props结构里
    if (objWithProps &&
        objWithProps.type === 'ObjectProperty' &&
        objWithProps.key.type === 'Identifier' &&
        objWithProps.key.name === 'props') {
        isMeetProp = true;
    }
    // 对应key是否是default
    if (path.parent &&
        path.parent.type === 'ObjectProperty' &&
        path.parent.key.type === 'Identifier' &&
        path.parent.key.name === 'default') {
        isMeetKey = true;
    }
    // 遍历到指定层数后是否是导出声明
    if (rootNode && rootNode.type === 'ExportDefaultDeclaration') {
        isMeetContainer = true;
    }
    return isMeetProp && isMeetKey && isMeetContainer;
}
function getStringLiteral(value) {
    return Object.assign(t.StringLiteral(value), {
        extra: {
            raw: `'${value}'`,
            rawValue: value,
        },
    });
}
function nodeToCode(node) {
    return (0, generator_1.default)(node).code;
}
// 允许往react函数组件中加入自定义代码
function insertSnippets(node, snippets) {
    if (node.body.type === 'BlockStatement' && snippets) {
        const returnStatement = node.body.body.find((node) => node.type === 'ReturnStatement');
        if (returnStatement) {
            const arg = returnStatement.argument;
            const argType = arg === null || arg === void 0 ? void 0 : arg.type;
            const code = nodeToCode(node);
            // 函数是否是react函数组件
            // 情况1: 返回的三元表达式包含JSXElement
            // 情况2: 直接返回了JSXElement
            if (argType === 'ConditionalExpression' &&
                (arg.consequent.type === 'JSXElement' || arg.alternate.type === 'JSXElement')) {
                if ((0, includeChinese_1.includeChinese)(code)) {
                    const statements = template_1.default.statements(snippets)();
                    node.body.body.unshift(...statements);
                }
            }
            else if (argType === 'JSXElement') {
                const statements = template_1.default.statements(snippets)();
                node.body.body.unshift(...statements);
            }
        }
    }
}
function transformJs(code, options) {
    const { rule } = options;
    const { caller, functionName, customizeKey, importDeclaration, functionSnippets, forceImport } = rule;
    let hasImportI18n = false; // 文件是否导入过i18n
    let hasTransformed = false; // 文件里是否存在中文转换，有的话才有必要导入i18n
    function getCallExpression(identifier, quote = "'") {
        const callerName = caller ? caller + '.' : '';
        // 如果是在script中且非函数组件的话，callerName可能为 this，则会报错
        // const expression = `${callerName}${functionName}(${quote}${identifier}${quote})`
        // @TODO: 后面改成可配置，目前写死key, desc形式
        const expression = `${functionName}({key: '', desc: ${quote}${identifier}${quote}})`;
        return expression;
    }
    function getReplaceValue(value, params) {
        // 需要过滤处理引号和换行
        value = (0, removeLineBreaksInTag_1.removeLineBreaksInTag)((0, escapeQuotes_1.escapeQuotes)(value));
        // 表达式结构 obj.fn('xx',{xx:xx})
        let expression;
        // i18n标记有参数的情况
        if (params) {
            const keyLiteral = getStringLiteral(customizeKey(value, collector_1.default.getCurrentCollectorPath()));
            if (caller) {
                // @TODO: 后面改成可配置
                // return t.callExpression(
                //   t.memberExpression(t.identifier(caller), t.identifier(functionName)),
                //   [keyLiteral, getObjectExpression(params)]
                // )
                return t.callExpression(t.memberExpression(t.identifier(caller), t.identifier(functionName)), [
                    t.objectExpression([
                        t.objectProperty(t.identifier('key'), t.stringLiteral('')),
                        t.objectProperty(t.identifier('desc'), keyLiteral),
                    ]),
                    getObjectExpression(params),
                ]);
            }
            else {
                // return t.callExpression(t.identifier(functionName), [
                //   keyLiteral,
                //   getObjectExpression(params),
                // ])
                return t.callExpression(t.identifier(functionName), [
                    t.objectExpression([
                        t.objectProperty(t.identifier('key'), t.stringLiteral('')),
                        t.objectProperty(t.identifier('desc'), keyLiteral),
                    ]),
                    getObjectExpression(params),
                ]);
            }
        }
        else {
            // i18n标记没参数的情况
            expression = getCallExpression(customizeKey(value, collector_1.default.getCurrentCollectorPath()));
            return template_1.default.expression(expression)();
        }
    }
    function transformAST(code, options) {
        function getTraverseOptions() {
            return {
                enter(path) {
                    const leadingComments = path.node.leadingComments;
                    if (leadingComments) {
                        // 是否跳过翻译
                        let isSkipTransform = false;
                        leadingComments.every((comment) => {
                            if (comment.value.includes(constants_1.IGNORE_REMARK)) {
                                isSkipTransform = true;
                                return false;
                            }
                            return true;
                        });
                        if (isSkipTransform) {
                            path.skip();
                        }
                    }
                },
                StringLiteral(path) {
                    const value = path.node.value;
                    // 处理vue props里的中文
                    if ((0, includeChinese_1.includeChinese)(value) && options.isJsInVue && isPropNode(path)) {
                        const expression = `function() {
              return ${getCallExpression(value)}
            }`;
                        collector_1.default.add(value, customizeKey);
                        path.replaceWith(template_1.default.expression(expression)());
                        path.skip();
                        return;
                    }
                    if ((0, includeChinese_1.includeChinese)(value)) {
                        hasTransformed = true;
                        collector_1.default.add(value, customizeKey);
                        path.replaceWith(getReplaceValue(value));
                    }
                    path.skip();
                },
                TemplateLiteral(path) {
                    const { node } = path;
                    const templateMembers = [...node.quasis, ...node.expressions];
                    templateMembers.sort((a, b) => a.start - b.start);
                    const shouldReplace = node.quasis.some((node) => (0, includeChinese_1.includeChinese)(node.value.raw));
                    if (shouldReplace) {
                        let value = '';
                        let slotIndex = 1;
                        const params = {};
                        templateMembers.forEach(function (node) {
                            if (node.type === 'Identifier') {
                                value += `{${node.name}}`;
                                params[node.name] = node.name;
                            }
                            else if (node.type === 'TemplateElement') {
                                value += node.value.raw.replace(/[\r\n]/g, ''); // 用raw防止字符串中出现 /n
                            }
                            else if (node.type === 'MemberExpression') {
                                const key = `slot${slotIndex++}`;
                                value += `{${key}}`;
                                params[key] = {
                                    isAstNode: true,
                                    value: node,
                                };
                            }
                            else {
                                // 处理${}内容为表达式的情况。例如`测试${a + b}`，把 a+b 这个语法树作为params的值, 并自定义params的键为slot加数字的形式
                                const key = `slot${slotIndex++}`;
                                value += `{${key}}`;
                                const expression = (0, generator_1.default)(node).code;
                                const tempAst = transformAST(expression, options);
                                const expressionAst = tempAst.program.body[0].expression;
                                params[key] = {
                                    isAstNode: true,
                                    value: expressionAst,
                                };
                            }
                        });
                        hasTransformed = true;
                        collector_1.default.add(value, customizeKey);
                        const slotParams = (0, isEmpty_1.default)(params) ? undefined : params;
                        path.replaceWith(getReplaceValue(value, slotParams));
                    }
                },
                JSXText(path) {
                    const value = path.node.value;
                    if ((0, includeChinese_1.includeChinese)(value)) {
                        hasTransformed = true;
                        collector_1.default.add(value.trim(), customizeKey);
                        path.replaceWith(t.JSXExpressionContainer(getReplaceValue(value.trim())));
                    }
                    path.skip();
                },
                JSXAttribute(path) {
                    var _a;
                    const node = path.node;
                    const valueType = (_a = node.value) === null || _a === void 0 ? void 0 : _a.type;
                    if (valueType === 'StringLiteral' && node.value && (0, includeChinese_1.includeChinese)(node.value.value)) {
                        const value = node.value.value;
                        const jsxIdentifier = t.jsxIdentifier(node.name.name);
                        const jsxContainer = t.jSXExpressionContainer(getReplaceValue(value));
                        hasTransformed = true;
                        collector_1.default.add(value, customizeKey);
                        path.replaceWith(t.jsxAttribute(jsxIdentifier, jsxContainer));
                        path.skip();
                    }
                },
                CallExpression(path) {
                    const { node } = path;
                    const callee = node.callee;
                    // 根据全局配置，跳过不需要提取的函数
                    const globalRule = stateManager_1.default.getToolConfig().globalRule;
                    const code = nodeToCode(node);
                    globalRule.ignoreMethods.forEach((ignoreRule) => {
                        if (code.startsWith(ignoreRule)) {
                            path.skip();
                            return;
                        }
                    });
                    // 跳过console.log的提取
                    if (callee.type === 'MemberExpression' &&
                        callee.object.type === 'Identifier' &&
                        callee.object.name === 'console') {
                        path.skip();
                        return;
                    }
                    // 无调用对象的情况，例如$t('xx')
                    if (callee.type === 'Identifier' && callee.name === functionName) {
                        path.skip();
                        return;
                    }
                    // 有调用对象的情况，例如this.$t('xx')、i18n.$t('xx)
                    if (callee.type === 'MemberExpression') {
                        if (callee.property && callee.property.type === 'Identifier') {
                            if (callee.property.name === functionName) {
                                // 处理形如i18n.$t('xx)的情况
                                if (callee.object.type === 'Identifier' && callee.object.name === caller) {
                                    path.skip();
                                    return;
                                }
                                // 处理形如this.$t('xx')的情况
                                if (callee.object.type === 'ThisExpression' && caller === 'this') {
                                    path.skip();
                                    return;
                                }
                            }
                        }
                    }
                },
                ImportDeclaration(path) {
                    const res = importDeclaration.match(/from ["'](.*)["']/);
                    const packageName = res ? res[1] : '';
                    if (path.node.source.value === packageName) {
                        hasImportI18n = true;
                    }
                    if (!hasImportI18n && hasTransformed) {
                        const importAst = template_1.default.statements(importDeclaration)();
                        const program = path.parent;
                        importAst.forEach((statement) => {
                            program.body.unshift(statement);
                        });
                        hasImportI18n = true;
                    }
                },
                ArrowFunctionExpression(path) {
                    const { node } = path;
                    // 函数组件必须在代码最外层
                    if (path.parentPath.scope.block.type !== 'Program') {
                        return;
                    }
                    // 允许往react函数组件中加入自定义代码
                    insertSnippets(node, functionSnippets);
                },
                FunctionExpression(path) {
                    const { node } = path;
                    // 函数组件必须在代码最外层
                    if (path.parentPath.scope.block.type !== 'Program') {
                        return;
                    }
                    // 允许往react函数组件中加入自定义代码
                    insertSnippets(node, functionSnippets);
                },
            };
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const ast = options.parse(code);
        (0, traverse_1.default)(ast, getTraverseOptions());
        return ast;
    }
    const ast = transformAST(code, options);
    const result = (0, generator_1.default)(ast, {
        compact: false,
        retainLines: true,
    });
    // 文件里没有出现任何导入语句的情况
    if (!hasImportI18n && hasTransformed) {
        result.code = `${importDeclaration}\n${result.code}`;
    }
    // 有forceImport时，即使没发生中文提取，也要在文件里加入i18n导入语句
    if (!hasImportI18n && !hasTransformed && forceImport) {
        result.code = `${importDeclaration}\n${result.code}`;
    }
    return result;
}
exports.default = transformJs;
