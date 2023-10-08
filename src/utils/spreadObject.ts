import type { StringObject } from '../../types'
import set from 'lodash/set'

export function spreadObject(obj: Record<string, string>): StringObject {
  const newObject: StringObject = {}
  console.log('spreadObject', JSON.stringify(obj))
  Object.keys(obj).forEach((key) => {
    // 中文.中文，存在这种可能性，所以会生成特殊的对象，那么我会判断，如果是存在2个. 或者.在末尾，不分割
    if (key && (key.indexOf('..') !== -1 || key[key.length - 1] === '.')) {
      set(newObject, [key], obj[key])
    } else {
      const keyList = key.split('.')
      set(newObject, keyList, obj[key])
    }
  })
  return newObject
}
