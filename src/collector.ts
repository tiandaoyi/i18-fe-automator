import type { CustomizeKey, StringObject } from '../types'
import log from './utils/log'
import { removeLineBreaksInTag } from './utils/removeLineBreaksInTag'
import { escapeQuotes } from './utils/escapeQuotes'
import { includeChinese } from './utils/includeChinese'

class Collector {
  private static _instance: Collector
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance() {
    if (!this._instance) {
      this._instance = new Collector()
    }
    return this._instance
  }

  private keyMap: StringObject = {}
  // 记录每个文件执行提取的次数
  private countOfAdditions = 0
  // 记录单个文件里提取的中文，键为自定义key，值为原始中文key
  private currentFileKeyMap: Record<string, string> = {}
  private currentFilePath = ''

  // key为uuid + 英文，value为中文
  private keyValueMap: Record<string, string> = {}

  setCurrentCollectorPath(path: string) {
    this.currentFilePath = path
  }

  getCurrentCollectorPath() {
    return this.currentFilePath
  }

  getKeyValueMap() {
    return this.keyValueMap
  }
  clearKeyValueMap() {
    this.keyValueMap = {}
  }

  // 第三个参数可以用来判断是否第一次访问，第一次访问是无中文的，第二次访问是有中文的
  add(value: string, customizeKeyFn: CustomizeKey, oldChinese?: string) {
    log.verbose('collector:add::')
    log.verbose(value)
    log.verbose(oldChinese as string)
    if (!oldChinese) {
      // console.log('add,value ', value)
      const formattedValue = removeLineBreaksInTag(value)
      const customizeKey = customizeKeyFn(escapeQuotes(formattedValue), this.currentFilePath) // key中不能包含回车
      log.verbose('提取中文：', formattedValue)
      this.keyMap[customizeKey] = formattedValue.replace('|', "{'|'}") // '|' 管道符在vue-i18n表示复数形式,需要特殊处理。见https://vue-i18n.intlify.dev/guide/essentials/pluralization.html
      // this.countOfAdditions++
      this.currentFileKeyMap[customizeKey] = formattedValue
    }
    this.countOfAdditions++

    // oldChinese: 纯中文部分
    // value: [6位hash]-[desc的英文]
    if (oldChinese && value && !includeChinese(value)) {
      // this.keyValueMap[customizeKey] = oldChinese
      this.keyValueMap[value] = oldChinese
    }
  }

  getCurrentFileKeyMap(): Record<string, string> {
    return this.currentFileKeyMap
  }

  resetCurrentFileKeyMap() {
    this.currentFileKeyMap = {}
  }

  getKeyMap(): StringObject {
    return this.keyMap
  }

  setKeyMap(value: StringObject) {
    this.keyMap = value
  }

  resetCountOfAdditions() {
    this.countOfAdditions = 0
  }

  getCountOfAdditions(): number {
    return this.countOfAdditions
  }
}

export default Collector
