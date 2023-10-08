import chalk from 'chalk'
import type { Rules, FileExtension, ExtraRule } from '../types'
import transformJs from './transformJs'
import transformVue from './transformVue'
import { initParse } from './parse'
import Collector from './collector'

const presetTypescript = require('@babel/preset-typescript')

function transform(
  code: string,
  ext: FileExtension,
  rules: Rules,
  filePath: string,
  extraRule?: ExtraRule
): {
  code: string
} {
  switch (ext) {
    case 'cjs':
    case 'mjs':
    case 'js':
    case 'jsx':
      return transformJs(code, {
        rule: rules[ext],
        parse: initParse(),
        sourceContent: extraRule?.sourceContent,
        collector: extraRule?.collector || Collector.getInstance(),
      })
    case 'ts':
    case 'tsx':
      return transformJs(code, {
        rule: rules[ext],
        parse: initParse([[presetTypescript, { isTSX: true, allExtensions: true }]]),
        sourceContent: extraRule?.sourceContent,
        collector: extraRule?.collector || Collector.getInstance(),
      })
    case 'vue':
      // 规则functionName废弃掉，使用functionNameInScript代替
      rules[ext].functionName = rules[ext].functionNameInScript ?? ''
      return transformVue(code, {
        rule: rules[ext],
        filePath,
        sourceContent: extraRule?.sourceContent,
        collector: extraRule?.collector || Collector.getInstance(),
      })
    default:
      throw new Error(chalk.red(`不支持对.${ext}后缀的文件进行提取`))
  }
}

export default transform
