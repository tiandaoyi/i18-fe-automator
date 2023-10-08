import md5 from 'md5'
import qs from 'qs'
import { Response } from 'got/dist/source/core/index'
const got = require('got')
import log from '../../utils/log'

export interface BaiduConfig {
  key?: string
  secret?: string
}

const MAX_COUNT = 500
const DELAY_TIME = 2000

export async function baiduTranslate(
  word: string,
  originLang: string,
  targetLang: string,
  option: BaiduConfig
): Promise<Array<{ src: string; dst: string }>> {
  const key = option.key
  const secret = option.secret
  const salt = Math.random()
  const sign = md5(key + word + salt + secret)
  const baseUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
  const params = {
    from: originLang,
    to: targetLang.split('-')[0],
    appid: key,
    salt,
    sign,
    q: word,
  }
  log.success(`本批次${word.length}个中文待翻译`)
  log.info('q' + word)
  const requestLimitLen = Math.ceil(word.length / MAX_COUNT)
  const paramsList: any = []
  const urlList: string[] = []
  for (let i = 0; i < requestLimitLen; i++) {
    const currText = word.slice(i * MAX_COUNT, MAX_COUNT * (i + 1))
    log.success(`第${i + 1}小队${currText.length}个中文`)

    paramsList.push({
      ...params,
      q: currText,
    })
    urlList.push(`${baseUrl}?${qs.stringify(params)}`)
  }

  const list = await callApiMultipleTimes(urlList, paramsList)
  return new Promise((resolve) => resolve(list.flat(Infinity)))
}

function callApiMultipleTimes(urlList: any, paramsList: any) {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const promises = paramsList.map((params: any, index: number) => {
    return delay(DELAY_TIME * index)
      .then(() => {
        log.success(`开始执行翻译本批次第${index + 1}次请求`)
        // 调用接口，并返回 Promise 对象
        return got.get(urlList[0])
      })
      .then(({ body }: Response<string>) => {
        const res = JSON.parse(body)
        if (!res.error_code) {
          return res.trans_result
        } else {
          throw body
        }
      })
      .catch((error) => {
        console.error(`Error calling API for params: ${JSON.stringify(params)}`, error)
        throw error
      })
  })

  return Promise.all(promises)
}
