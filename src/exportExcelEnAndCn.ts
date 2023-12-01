import fs from 'fs-extra'
// import type { StringObject } from '../types'
import StateManager from './utils/stateManager'
import { getExcelHeader, buildExcel } from './utils/excelUtil'
import { getAbsolutePath } from './utils/getAbsolutePath'
// import getLang from './utils/getLang'
// import log from './utils/log'
import { getLocaleDir } from './utils/getLocaleDir'
// import { flatObjectDeep } from './utils/flatObjectDeep'

export default function exportExcelEnAndCn(obj: any) {
  const { excelPath } = StateManager.getToolConfig()
  const headers = getExcelHeader()
  const excelFileName = `脚本输出文件(${new Date().valueOf()}).xlsx`
  // 读取语言包
  const localeDirPath = getLocaleDir()
  // log.info('localeDirPath')
  // log.info(localeDirPath)
  // 读取./locales/en-US.json文件
  const currentLocalePath = getAbsolutePath(localeDirPath, `en-US.json`)
  const currentLocaleObj = fs.readJSONSync(currentLocalePath)
  // log.info('currentLocaleObj')
  // log.info(currentLocaleObj)
  const data: any = []
  const failData: any = []
  Object.entries(obj).forEach(([key, value]) => {
    const en = currentLocaleObj[value as string] || ''
    let isErrorKey = false
    if (
      !key ||
      (key && key.indexOf('[object Object]]') > -1) ||
      (key && key.indexOf('debug') > -1)
    ) {
      isErrorKey = true
      // 修复导出的key包含[object Object]情况导致的重复问题
      if (key && key.indexOf('[object Object]]') > -1) {
        key = key + String((Math.random() * 10000) >> 0)
      }
    }
    if (key && typeof key === 'string') {
      key = key.slice(0, 80)
    }

    if (isErrorKey || !en || !value) {
      failData.push([key as string, value as string, en])
    } else {
      data.push([key as string, value as string, en])
    }
  })

  const excelBuffer = buildExcel(headers, data.concat(failData), excelFileName)
  fs.writeFileSync(getAbsolutePath(process.cwd(), excelPath), excelBuffer, 'utf8')
}
