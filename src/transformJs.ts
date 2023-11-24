import { NodePath } from '@babel/traverse'
import type {
  Comment,
  StringLiteral,
  TemplateLiteral,
  ObjectProperty,
  ObjectMethod,
  SpreadElement,
  JSXText,
  JSXAttribute,
  Program,
  ImportDeclaration,
  CallExpression,
  ObjectExpression,
  MemberExpression,
  Expression,
  ArrowFunctionExpression,
  Node,
  ReturnStatement,
  FunctionExpression,
  Property,
  Identifier,
} from '@babel/types'
import { v5 as uuidv5 } from 'uuid'
import type { GeneratorResult } from '@babel/generator'
import type { transformOptions } from '../types'
import traverse from '@babel/traverse'
import babelGenerator from '@babel/generator'
import template from '@babel/template'
import isEmpty from 'lodash/isEmpty'
import Collector from './collector'
import { includeChinese } from './utils/includeChinese'
import { isObject } from './utils/assertType'
import { escapeQuotes } from './utils/escapeQuotes'
import { IGNORE_REMARK } from './utils/constants'
import StateManager from './utils/stateManager'
import { removeLineBreaksInTag } from './utils/removeLineBreaksInTag'
import log from './utils/log'

const t = require('@babel/types')

let currCollector = Collector.getInstance()

type TemplateParams = {
  [k: string]:
    | string
    | {
        isAstNode: true
        value: Expression
      }
}

function getObjectExpression(obj: TemplateParams): ObjectExpression {
  const ObjectPropertyArr: Array<ObjectMethod | ObjectProperty | SpreadElement> = []
  Object.keys(obj).forEach((k) => {
    const tempValue = obj[k]
    let newValue
    if (isObject(tempValue)) {
      newValue = tempValue.value
    } else {
      newValue = t.identifier(tempValue)
    }
    ObjectPropertyArr.push(t.objectProperty(t.identifier(k), newValue))
  })
  const ast = t.objectExpression(ObjectPropertyArr)
  return ast
}

function getDeepObjVal(myObj: any, val: string): any {
  // 如果不是个对象，return随机数
  if (!myObj) return String(Math.random() * 10000) + 'debug71'
  if (typeof myObj === 'object') {
    const newVal = myObj[val] || myObj['']
    return typeof newVal === 'object' ? getDeepObjVal(newVal, val) : newVal
  }
  return val
}

// 判断节点是否是props属性的默认值
function isPropNode(path: NodePath<StringLiteral>): boolean {
  const objWithProps = path.parentPath?.parentPath?.parentPath?.parentPath?.parent
  const rootNode =
    path.parentPath?.parentPath?.parentPath?.parentPath?.parentPath?.parentPath?.parent
  let isMeetProp = false
  let isMeetKey = false
  let isMeetContainer = false
  // 属性是否包含在props结构里
  if (
    objWithProps &&
    objWithProps.type === 'ObjectProperty' &&
    objWithProps.key.type === 'Identifier' &&
    objWithProps.key.name === 'props'
  ) {
    isMeetProp = true
  }
  // 对应key是否是default
  if (
    path.parent &&
    path.parent.type === 'ObjectProperty' &&
    path.parent.key.type === 'Identifier' &&
    path.parent.key.name === 'default'
  ) {
    isMeetKey = true
  }
  // 遍历到指定层数后是否是导出声明
  if (rootNode && rootNode.type === 'ExportDefaultDeclaration') {
    isMeetContainer = true
  }
  return isMeetProp && isMeetKey && isMeetContainer
}

function getStringLiteral(value: string): StringLiteral {
  return Object.assign(t.StringLiteral(value), {
    extra: {
      raw: `'${value}'`,
      rawValue: value,
    },
  })
}

function nodeToCode(node: Node): string {
  return babelGenerator(node).code
}

// 允许往react函数组件中加入自定义代码
function insertSnippets(node: ArrowFunctionExpression | FunctionExpression, snippets?: string) {
  if (node.body.type === 'BlockStatement' && snippets) {
    const returnStatement = node.body.body.find((node: Node) => node.type === 'ReturnStatement')
    if (returnStatement) {
      const arg = (returnStatement as ReturnStatement).argument
      const argType = arg?.type
      const code = nodeToCode(node)
      // 函数是否是react函数组件
      // 情况1: 返回的三元表达式包含JSXElement
      // 情况2: 直接返回了JSXElement
      if (
        argType === 'ConditionalExpression' &&
        (arg.consequent.type === 'JSXElement' || arg.alternate.type === 'JSXElement')
      ) {
        if (includeChinese(code)) {
          const statements = template.statements(snippets)()
          node.body.body.unshift(...statements)
        }
      } else if (argType === 'JSXElement') {
        const statements = template.statements(snippets)()
        node.body.body.unshift(...statements)
      }
    }
  }
}

function transformJs(code: string, options: transformOptions): GeneratorResult {
  const { rule, sourceContent, collector } = options

  const isTransformKey = !!sourceContent

  const { caller, functionName, customizeKey, importDeclaration, functionSnippets, forceImport } =
    rule
  currCollector = collector || currCollector || Collector.getInstance()
  let hasImportI18n = false // 文件是否导入过i18n
  let hasTransformed = false // 文件里是否存在中文转换，有的话才有必要导入i18n

  function getCallExpression(identifier: string, quote = "'"): string {
    // if (isTransformKey) {
    //   log.debug('getCallExpression:identifier', identifier)
    // }
    const expression = `${functionName}({key: '', desc: ${quote}${identifier}${quote}})`
    // log.debug('expression--end', expression)

    return expression
  }

  function getReplaceValue(value: string, params?: TemplateParams) {
    let targetKeyLiteral = t.stringLiteral('')
    log.debug('172::::targetKeyLiteral')
    // 需要过滤处理引号和换行
    value = removeLineBreaksInTag(escapeQuotes(value))

    if (isTransformKey && value) {
      // log.debug('转换uuidEnKey')
      const uuidEnKey =
        sourceContent[value] ||
        getDeepObjVal(sourceContent, value) ||
        sourceContent[removeLineBreaksInTag(escapeQuotes(value))] ||
        getDeepObjVal(sourceContent, removeLineBreaksInTag(escapeQuotes(value))) ||
        String(Math.random() * 1000) + 'debug196'
      const uuidEnKeyStr = `${uuidv5(currCollector.getCurrentCollectorPath(), uuidv5.URL).slice(
        0,
        6
      )}-${uuidEnKey}`
      log.debug('转换uuidEnKey', uuidEnKeyStr)

      targetKeyLiteral = t.stringLiteral(uuidEnKeyStr)
      currCollector.add(uuidEnKeyStr, customizeKey, value)
    }
    // @TODO: 后面改成可配置

    // 表达式结构 obj.fn('xx',{xx:xx})
    let expression
    // i18n标记有参数的情况
    if (params) {
      // log.debug('keyLiteral209', value)
      const keyLiteral = getStringLiteral(
        customizeKey(value, currCollector.getCurrentCollectorPath())
      )
      // log.debug('keyLiteral210', keyLiteral)

      if (caller) {
        // @TODO: 后面改成可配置
        // return t.callExpression(
        //   t.memberExpression(t.identifier(caller), t.identifier(functionName)),
        //   [keyLiteral, getObjectExpression(params)]
        // )
        // return t.callExpression(
        //   // @TODO: 待改善
        //   t.memberExpression(t.identifier(caller), t.identifier(functionName)),
        //   [
        //     t.objectExpression([
        //       t.objectProperty(t.identifier('key'), targetKeyLiteral),
        //       t.objectProperty(t.identifier('desc'), keyLiteral),
        //     ]),
        //     getObjectExpression(params),
        //   ]
        // )
        return t.callExpression(
          // @TODO: 待改善
          t.identifier(functionName),
          [
            t.objectExpression([
              t.objectProperty(t.identifier('key'), targetKeyLiteral),
              t.objectProperty(t.identifier('desc'), keyLiteral),
            ]),
            getObjectExpression(params),
          ]
        )
      } else {
        // return t.callExpression(t.identifier(functionName), [
        //   keyLiteral,
        //   getObjectExpression(params),
        // ])
        return t.callExpression(t.identifier(functionName), [
          t.objectExpression([
            t.objectProperty(t.identifier('key'), targetKeyLiteral),
            t.objectProperty(t.identifier('desc'), keyLiteral),
          ]),
          getObjectExpression(params),
        ])
      }
    } else {
      // i18n标记没参数的情况
      expression = getCallExpression(customizeKey(value, currCollector.getCurrentCollectorPath()))
      return template.expression(expression)()
    }
  }

  function transformAST(code: string, options: transformOptions) {
    function getTraverseOptions() {
      return {
        // 第二次遍历，判断是否需要把key进行转换, isTransformKey
        enter(path: NodePath) {
          const leadingComments = path.node.leadingComments
          if (leadingComments) {
            // 是否跳过翻译
            let isSkipTransform = false
            // 如果包含i18-ignore，就跳过翻译
            leadingComments.every((comment: Comment) => {
              if (comment.value.includes(IGNORE_REMARK)) {
                isSkipTransform = true
                return false
              }
              return true
            })
            if (isSkipTransform) {
              path.skip()
            }
          }
        },

        StringLiteral(path: NodePath<StringLiteral>) {
          const value = path.node.value
          log.debug('StringLiteral----', value)
          // if (isTransformKey) {
          //   path.skip()
          //   return
          // }
          if (isTransformKey) {
            // log.debug('StringLiteral:val--a', value)
          }
          // 处理vue props里的中文
          log.debug('300' + value)
          log.debug('301' + options.isJsInVue)
          log.debug('302' + isPropNode(path))
          log.debug('303' + isTransformKey)
          if (includeChinese(value) && options.isJsInVue && isPropNode(path) && !isTransformKey) {
            // if (includeChinese(value) && options.isJsInVue && isPropNode(path)) {
            log.debug('这里应该是第一次')
            const expression = `function() {
              return ${getCallExpression(value)}
            }`
            currCollector.add(value, customizeKey)
            path.replaceWith(template.expression(expression)())
            path.skip()
            return
          }

          if (isTransformKey) {
            log.debug('第二次：StringLiteral,存在isTransformKey，:val')
          }
          if (includeChinese(value) && !isTransformKey) {
            log.debug('非isJSInVue或者非isPropNode, StringLiteral:val--b' + value)

            // if (includeChinese(value)) {

            hasTransformed = true
            // 第一次执行的逻辑，其实无用
            currCollector.add(value, customizeKey)
            path.replaceWith(getReplaceValue(value))
          }
          path.skip()
        },

        TemplateLiteral(path: NodePath<TemplateLiteral>) {
          log.debug('TemplateLiteral----', path)

          // if (isTransformKey) {
          //   path.skip()
          //   return
          // }
          const { node } = path
          const templateMembers = [...node.quasis, ...node.expressions]
          templateMembers.sort((a, b) => (a.start as number) - (b.start as number))

          const shouldReplace = node.quasis.some((node) => includeChinese(node.value.raw))

          // if (shouldReplace && !isTransformKey) {

          if (shouldReplace) {
            let value = ''
            let slotIndex = 1
            const params: TemplateParams = {}
            templateMembers.forEach(function (node) {
              if (node.type === 'Identifier') {
                value += `{${node.name}}`
                params[node.name] = node.name
              } else if (node.type === 'TemplateElement') {
                value += node.value.raw.replace(/[\r\n]/g, '') // 用raw防止字符串中出现 /n
              } else if (node.type === 'MemberExpression') {
                const key = `slot${slotIndex++}`
                value += `{${key}}`
                params[key] = {
                  isAstNode: true,
                  value: node as MemberExpression,
                }
              } else {
                // 处理${}内容为表达式的情况。例如`测试${a + b}`，把 a+b 这个语法树作为params的值, 并自定义params的键为slot加数字的形式
                const key = `slot${slotIndex++}`
                value += `{${key}}`
                const expression = babelGenerator(node).code
                const tempAst = transformAST(expression, options) as any
                const expressionAst = tempAst.program.body[0].expression
                params[key] = {
                  isAstNode: true,
                  value: expressionAst,
                }
              }
            })
            hasTransformed = true
            // log.debug('currCollector:value', value)
            if (!isTransformKey) {
              currCollector.add(value, customizeKey)
              const slotParams = isEmpty(params) ? undefined : params
              path.replaceWith(getReplaceValue(value, slotParams))
            } else {
              // currCollector.add(value, customizeKey)
              const slotParams = isEmpty(params) ? undefined : params
              // 内部会add
              path.replaceWith(getReplaceValue(value, slotParams))
            }
          }
        },

        JSXText(path: NodePath<JSXText>) {
          const value = path.node.value
          if (isTransformKey) {
            log.debug('JSX skip')
            path.skip()
            return
          }

          if (includeChinese(value) && !isTransformKey) {
            hasTransformed = true
            currCollector.add(value.trim(), customizeKey)
            path.replaceWith(t.JSXExpressionContainer(getReplaceValue(value.trim())))
          }
          path.skip()
        },

        JSXAttribute(path: NodePath<JSXAttribute>) {
          const node = path.node as NodePath<JSXAttribute>['node']
          const valueType = node.value?.type
          if (
            valueType === 'StringLiteral' &&
            node.value &&
            includeChinese(node.value.value) &&
            !isTransformKey
          ) {
            const value = node.value.value
            const jsxIdentifier = t.jsxIdentifier(node.name.name)
            const jsxContainer = t.jSXExpressionContainer(getReplaceValue(value))
            hasTransformed = true
            currCollector.add(value, customizeKey)
            path.replaceWith(t.jsxAttribute(jsxIdentifier, jsxContainer))
            path.skip()
          }
          if (isTransformKey) {
            log.debug('JSXAttribute skip')
          }
        },

        // 函数调用表达式
        CallExpression(path: NodePath<CallExpression>) {
          log.debug('CallExpression----', path)

          const { node } = path
          const callee = node.callee

          // 根据全局配置，跳过不需要提取的函数
          const globalRule = StateManager.getToolConfig().globalRule
          // log.debug('是否转换key：CallExpression', isTransformKey)
          // log.debug(callee)
          if (isTransformKey && callee.type === 'Identifier' && callee.name === functionName) {
            // 第一个参数
            const firstArgument = node.arguments[0]
            // 判断是否一个对象
            if (firstArgument && firstArgument.type === 'ObjectExpression') {
              const properties = firstArgument.properties
              // log.debug('整个对象', properties)

              const keyNode: any =
                properties.find(
                  (currNode) => ((currNode as ObjectProperty).key as any).name === 'key'
                ) || {}
              const descNode: any =
                properties.find(
                  (currNode) => ((currNode as ObjectProperty).key as any).name === 'desc'
                ) || {}

              if (
                keyNode.type === 'ObjectProperty' &&
                keyNode.value.value === '' &&
                descNode.value &&
                includeChinese(descNode.value.value)
              ) {
                log.debug(descNode.value.value)

                // log.debug('descNode.value.value--', descNode.value.value)
                let newValue =
                  sourceContent[descNode.value.value] ||
                  getDeepObjVal(sourceContent, descNode.value.value) ||
                  sourceContent[removeLineBreaksInTag(escapeQuotes(descNode.value.value))] ||
                  getDeepObjVal(
                    sourceContent,
                    removeLineBreaksInTag(escapeQuotes(descNode.value.value))
                  ) ||
                  String(Math.random() * 1000) + 'debug468'
                newValue = `${uuidv5(currCollector.getCurrentCollectorPath(), uuidv5.URL).slice(
                  0,
                  6
                )}-${newValue}`
                // path.replaceWith(getReplaceValue(value))
                keyNode.value = getStringLiteral(newValue)

                hasTransformed = true
                currCollector.add(newValue, customizeKey, descNode.value.value)
                // path.replaceWith(node)

                // keyNode.value.value = newValue
                // keyNode.value.extra = {
                //   raw: `'${newValue}'`,
                //   rawValue: newValue,
                // }
              }
            }
            path.skip()
            return
          }

          const code = nodeToCode(node)
          globalRule.ignoreMethods.forEach((ignoreRule) => {
            if (code.startsWith(ignoreRule)) {
              path.skip()
              return
            }
          })

          // 跳过console.log的提取
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'console'
          ) {
            path.skip()
            return
          }

          // 无调用对象的情况，例如$hxt('xx') 并且没有源内容
          if (callee.type === 'Identifier' && callee.name === functionName && !sourceContent) {
            path.skip()
            return
          }

          // 有调用对象的情况，例如this.$hxt('xx')、i18n.$hxt('xx)
          if (callee.type === 'MemberExpression' && !sourceContent) {
            if (callee.property && callee.property.type === 'Identifier') {
              if (callee.property.name === functionName) {
                // 处理形如i18n.$hxt('xx)的情况
                if (callee.object.type === 'Identifier' && callee.object.name === caller) {
                  path.skip()
                  return
                }
                // 处理形如this.$hxt('xx')的情况
                if (callee.object.type === 'ThisExpression' && caller === 'this') {
                  path.skip()
                  return
                }
              }
            }
          }
        },

        ImportDeclaration(path: NodePath<ImportDeclaration>) {
          log.debug('ImportDeclaration----', path)

          const res = importDeclaration.match(/from ["'](.*)["']/)
          const packageName = res ? res[1] : ''

          if (path.node.source.value === packageName) {
            hasImportI18n = true
          }

          if (!hasImportI18n && hasTransformed) {
            const importAst = template.statements(importDeclaration)()
            const program = path.parent as Program
            importAst.forEach((statement) => {
              program.body.unshift(statement)
            })
            hasImportI18n = true
          }
        },

        ArrowFunctionExpression(path: NodePath<ArrowFunctionExpression>) {
          log.debug('ArrowFunctionExpression----', path)

          const { node } = path
          // 函数组件必须在代码最外层
          if (path.parentPath.scope.block.type !== 'Program') {
            return
          }
          // 允许往react函数组件中加入自定义代码
          insertSnippets(node, functionSnippets)
        },

        FunctionExpression(path: NodePath<FunctionExpression>) {
          log.debug('FunctionExpression----', path)

          const { node } = path
          // 函数组件必须在代码最外层
          if (path.parentPath.scope.block.type !== 'Program') {
            return
          }
          // 允许往react函数组件中加入自定义代码
          insertSnippets(node, functionSnippets)
        },
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ast = options.parse!(code)
    traverse(ast, getTraverseOptions())
    return ast
  }

  // 转换成AST
  const ast = transformAST(code, options)
  // 再把AST转换成代码
  const result = babelGenerator(ast, {
    compact: false,
    retainLines: true,
  })
  // 文件里没有出现任何导入语句的情况
  if (!hasImportI18n && hasTransformed) {
    result.code = `${importDeclaration}\n${result.code}`
  }
  // 有forceImport时，即使没发生中文提取，也要在文件里加入i18n导入语句
  if (!hasImportI18n && !hasTransformed && forceImport) {
    result.code = `${importDeclaration}\n${result.code}`
  }
  return result
}

export default transformJs
