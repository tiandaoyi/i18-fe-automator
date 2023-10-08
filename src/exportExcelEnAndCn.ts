import fs from 'fs-extra'
// import type { StringObject } from '../types'
import StateManager from './utils/stateManager'
import { getExcelHeader, buildExcel } from './utils/excelUtil'
import { getAbsolutePath } from './utils/getAbsolutePath'
// import getLang from './utils/getLang'
// import log from './utils/log'
// import { getLocaleDir } from './utils/getLocaleDir'
// import { flatObjectDeep } from './utils/flatObjectDeep'

export default function exportExcelEnAndCn(obj: any) {
  const { excelPath } = StateManager.getToolConfig()
  const headers = getExcelHeader()
  const excelFileName = `前端keyValue${new Date().valueOf()}.xlsx`
  const data = Object.entries(obj).map(([key, value]) => {
    return [key as string, value as string]
  })
  const excelBuffer = buildExcel(headers, data, excelFileName)
  fs.writeFileSync(getAbsolutePath(process.cwd(), excelPath), excelBuffer, 'utf8')
}
