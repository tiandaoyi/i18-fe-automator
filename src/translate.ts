import fs from 'fs-extra'
import {
  googleTranslate,
  youdaoTranslate,
  baiduTranslate,
  chatGPTTranslate,
} from './translate-utils/src/index'
import type { TranslateConfig, StringObject, translatorType } from '../types'
import { getAbsolutePath } from './utils/getAbsolutePath'
import log from './utils/log'
import { GOOGLE, YOUDAO, BAIDU, CHAT_GPT } from './utils/constants'
import getLang from './utils/getLang'
import StateManager from './utils/stateManager'
import { saveLocaleFile } from './utils/saveLocaleFile'
import { flatObjectDeep } from './utils/flatObjectDeep'
import { spreadObject } from './utils/spreadObject'

async function translateByGoogle(
  word: string,
  locale: string,
  options: TranslateConfig
): Promise<string> {
  // if (!options.google || !options.google?.proxy) {
  if (!options.google) {
    log.error('翻译失败，当前翻译器为谷歌，请完善google配置参数')
    process.exit(1)
  }
  try {
    return await googleTranslate(word, 'zh-CN', locale, options.google.proxy || '')
  } catch (e: any) {
    if (e.name === 'TooManyRequestsError') {
      log.error('翻译失败，请求超过谷歌api调用次数限制')
    } else {
      log.error('谷歌翻译请求出错', e)
    }
    return ''
  }
}

async function translateByYoudao(
  word: string,
  locale: string,
  options: TranslateConfig
): Promise<string> {
  if (!options.youdao || !options.youdao?.key || !options.youdao?.secret) {
    log.error('翻译失败，当前翻译器为有道，请完善youdao配置参数')
    process.exit(1)
  }
  try {
    return await youdaoTranslate(word, 'zh-CN', locale, options.youdao)
  } catch (e) {
    log.error('有道翻译请求出错', e)
    return ''
  }
}

async function translateByChatGPT(
  word: string,
  locale: string,
  options: TranslateConfig
): Promise<string> {
  if (!options.chatGPT || !options.chatGPT?.key) {
    log.error('翻译失败，当前翻译器为有道，请完善youdao配置参数')
    process.exit(1)
  }
  try {
    return await chatGPTTranslate(word, 'zh-CN', locale, options.chatGPT)
  } catch (e) {
    log.error('chatGPT请求出错', e)
    return ''
  }
}

// StringObject可能是：ss: {ss: sss:ss}
function convertToCamelCase(str: string | StringObject) {
  if (typeof str !== 'string') {
    return str
  }
  // 去除标点符号
  const cleanedStr = str.replace(/[^\w\s]/gi, '')
  // 将字符串按空格分割为单词数组
  const words = cleanedStr.split(/\s+/)
  // 转换为大驼峰格式
  const camelCaseStr = words
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')

  return camelCaseStr
}

async function translateByBaidu(
  word: string,
  locale: string,
  options: TranslateConfig
): Promise<string> {
  if (!options.baidu || !options.baidu?.key || !options.baidu?.secret) {
    log.error('翻译失败，当前翻译器为百度，请完善baidu配置参数')
    process.exit(1)
  }
  try {
    return (await baiduTranslate(word, 'zh', locale, options.baidu)) as any
  } catch (e) {
    log.error('百度翻译请求出错', e)
    return ''
  }
}

export default async function (
  localePath: string,
  locales: string[],
  oldPrimaryLang: StringObject,
  options: TranslateConfig
) {
  if (![GOOGLE, YOUDAO, BAIDU, CHAT_GPT].includes(options.translator || '')) {
    log.error('翻译失败，请确认translator参数是否配置正确')
    process.exit(1)
  }
  log.verbose('当前使用的翻译器：', options.translator)
  const primaryLangPath = getAbsolutePath(process.cwd(), localePath)
  // 默认是中文的 json，getLang获取object类型
  const newPrimaryLang = flatObjectDeep(getLang(primaryLangPath))
  const localeFileType = StateManager.getToolConfig().localeFileType
  let targetContent = {}
  for (const targetLocale of locales) {
    log.info(`正在翻译${targetLocale}语言包`)

    const reg = new RegExp(`/[A-Za-z-]+.${localeFileType}`, 'g')
    const targetPath = localePath.replace(reg, `/${targetLocale}.${localeFileType}`)
    const targetLocalePath = getAbsolutePath(process.cwd(), targetPath)
    let oldTargetLangPack: Record<string, string> = {}
    let newTargetLangPack: Record<string, string> = {}
    // en-US.json : {"新增申请": "New application"}
    // 如果en-US存在，就把老的en-US拿过来用
    if (fs.existsSync(targetLocalePath)) {
      oldTargetLangPack = flatObjectDeep(getLang(targetLocalePath))
    } else {
      fs.ensureFileSync(targetLocalePath)
    }

    const keyList = Object.keys(newPrimaryLang) // ["天才", "你好"]
    //
    const willTranslateText: Record<string, string> = {}

    // 每个key就是一个中文
    for (const key of keyList) {
      // 主语言同一个key的value不变，就复用原有的翻译结果
      // 现在中文的内容
      const oldLang = flatObjectDeep(oldPrimaryLang)
      // 判断转老的 扁平
      // oldLang：老的中文对象，第一次应该是空的
      // newPrimaryLang： 有值的中文json
      // 如果老的中文对象中有值，并且en-US.json中该中文有值
      // 则把en-US.json中的英文赋值给newTargetLangPack
      const isNotChanged = oldLang[key] === newPrimaryLang[key]
      if (isNotChanged && oldTargetLangPack[key]) {
        // {"天才": 'enxx'}
        newTargetLangPack[key] = oldTargetLangPack[key]
      } else {
        // 老的中文对象没匹配到，则把该中文给willTranslateText对象
        // {"天才": "天才"}
        willTranslateText[key] = newPrimaryLang[key]
      }
    }

    // 翻译新增键值对内容
    const translator = new Translator({
      provider: options.translator || YOUDAO,
      targetLocale,
      providerOptions: options,
    })
    const { incrementalTranslation, incrementalTranslationCamelCase } = await translator.translate(
      willTranslateText
    )
    // newTargetLangPack对象中可能包含未转驼峰的value，需要批量处理
    const _newTargetLangPack: any = {}
    Object.entries(newTargetLangPack).forEach(([key, val]) => {
      _newTargetLangPack[key] = convertToCamelCase(val)
    })

    const otherTargetLangPack = JSON.parse(
      JSON.stringify({
        ...newTargetLangPack,
        ...incrementalTranslation,
      })
    )
    // 这个是驼峰的key
    newTargetLangPack = JSON.parse(
      JSON.stringify({
        ..._newTargetLangPack,
        ...incrementalTranslationCamelCase,
      })
    )

    // console.log('otherTargetLangPack', otherTargetLangPack)
    // console.log('newTargetLangPack', newTargetLangPack)

    // 驼峰的key
    const fileContent = spreadObject(newTargetLangPack)
    // 非驼峰的key -> 应该要存储到en_US.json的内容
    const otherFileContent = spreadObject(otherTargetLangPack)
    let obj: any = {}

    const getObj = (targetFileContent: any, newObj: any) => {
      newObj = JSON.parse(JSON.stringify(newObj))
      Object.keys(targetFileContent).forEach((key) => {
        // 如果key是字符串，newObj = {x: x}
        if (typeof targetFileContent[key] === 'string') {
          const item = targetFileContent[key]
          newObj[key] = item
        } else {
          // 如果key是非字符串
          newObj[key] = targetFileContent[key]
        }
      })
      return newObj
    }

    // 把英文语言包内容拷贝到目标语言包
    if (targetLocale === 'en-US' || targetLocale === 'en') {
      // 把'en-US'改成original-en-US
      // const enPath = localePath.replace(/\/[A-Za-z-]+.json/, '/hump-en-US.json')
      const enPath = targetLocalePath.replace(/\/[A-Za-z-]+.json/, '/hump-en-US.json')
      // 全驼峰，无空格的英文key，hump-en-US.json
      targetContent = getObj(fileContent, obj)
      // 保存这个全驼峰的文件 -> /hump-en-US.json
      saveLocaleFile(targetContent, enPath)
      // log.info(`完成${targetLocale}语言包翻译`)

      obj = {}
      const tempTargetContent = getObj(otherFileContent, obj)
      saveLocaleFile(tempTargetContent, targetLocalePath)
    } else {
      // @TODO: 目前执行不到
      saveLocaleFile(obj, targetLocalePath)
      // log.info(`完成${targetLocale}语言包翻译`)
    }
  }

  return targetContent
}

type tranlateFunction = (
  word: string,
  locale: string,
  options: TranslateConfig
) => Promise<string | Array<{ src: string; dst: string }>>

interface TranslatorConstructor {
  provider: translatorType
  targetLocale: string
  providerOptions: TranslateConfig
}
class Translator {
  #provider: tranlateFunction
  #targetLocale: string
  #providerOptions: TranslateConfig
  #textLengthLimit = 1000
  #separator = '\n' // 翻译文本拼接用的分隔符

  constructor({ provider, targetLocale, providerOptions }: TranslatorConstructor) {
    switch (provider) {
      case YOUDAO:
        this.#provider = translateByYoudao
        break
      case GOOGLE:
        this.#provider = translateByGoogle
        break
      case BAIDU:
        this.#provider = translateByBaidu
        break
      case CHAT_GPT:
        this.#provider = translateByChatGPT
    }
    this.#targetLocale = targetLocale
    this.#providerOptions = providerOptions
  }

  async translate(dictionary: Record<string, string>): Promise<{
    incrementalTranslation: Record<string, string>
    incrementalTranslationCamelCase: Record<string, string>
  }> {
    const allTextArr = Object.keys(dictionary).map((key) => dictionary[key])
    let restTextBundleArr = allTextArr
    log.debug(`allTextArr:${allTextArr.length}`)
    log.debug(`restTextBundleArr:${restTextBundleArr.length}`)

    const translationCount = 100
    let startIndex = 0
    // 翻译后的数据
    const result: string[] = []

    // 每轮循环，先判断100行key-value的字符数量
    // 如果字符小于1w，以两倍速度递增，扩大翻译行数，以尽可能翻译更多的行数
    // 如果字符大于1w，以两倍倍速度递减，扩小翻译行数，以尽可能翻译更多的行数
    // 确定了行数后开始翻译，一直循环到翻译完所有行
    while (startIndex < allTextArr.length && restTextBundleArr.length > 0) {
      const maxTranslationCount = this.getMaxTranslationCount(
        restTextBundleArr,
        0,
        translationCount
      )
      const textBundleArr = allTextArr.slice(startIndex, startIndex + maxTranslationCount)
      restTextBundleArr = allTextArr.slice(startIndex + maxTranslationCount)
      startIndex = startIndex + maxTranslationCount
      const [res] = await Promise.all([
        this.#provider(
          textBundleArr.join(this.#separator), // 文本中可能有逗号，为了防止后面分割字符出错，使用\\$代替逗号
          this.#targetLocale,
          this.#providerOptions
        ),
        new Promise((resolve) => {
          log.success('3000m后执行下一批')
          setTimeout(resolve, 3000)
        }), // 有道翻译接口限制每秒1次请求
      ])

      let resArr: string[]
      // @TODO:只考虑了英文的情况
      if (typeof res === 'object') {
        // 百度比较特殊，是dst
        resArr = res.map((item) => item.dst.charAt(0).toUpperCase() + item.dst.slice(1))
      } else {
        // 用\n分割
        resArr = res
          .split(this.#separator)
          .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      }
      result.push(...resArr)
    }

    const incrementalTranslationCamelCase: Record<string, string> = {}
    const incrementalTranslation: Record<string, string> = {}
    Object.keys(dictionary).forEach((key, index) => {
      // 翻译后有可能字符串前后会多出一个空格，这里做一下过滤
      let translatedText = result[index] || ''
      if (!dictionary[key].startsWith(' ') && translatedText.startsWith(' ')) {
        translatedText = translatedText.slice(1)
      }
      if (!dictionary[key].endsWith(' ') && translatedText.endsWith(' ')) {
        translatedText = translatedText.slice(0, -1)
      }
      incrementalTranslation[key] = translatedText
      incrementalTranslationCamelCase[key] = convertToCamelCase(translatedText) as string
    })
    return {
      incrementalTranslation,
      incrementalTranslationCamelCase,
    }
  }

  // 递归获取1w字以内的能够翻译的最大行数
  getMaxTranslationCount(
    textArr: string[],
    allowTranslationCount: number,
    tryTranslationCount: number
  ): number {
    const textNum = textArr.length
    const diff = Math.min(tryTranslationCount, textNum)
    const textBundleArr = textArr.slice(0, diff)
    const textBundleLength = textBundleArr.join(this.#separator).length
    // allowTranslationCount > tryTranslationCount 是指待翻译内容一开始就超出限制字数的情况
    // allowTranslationCount === textNum 是指待翻译内容一开始就小于限制字数的情况
    if (allowTranslationCount > tryTranslationCount || allowTranslationCount === textNum) {
      return allowTranslationCount
    } else if (textBundleLength <= this.#textLengthLimit) {
      return this.getMaxTranslationCount(textArr, diff, tryTranslationCount * 2)
    } else {
      const midCount = Math.floor((tryTranslationCount - allowTranslationCount) / 2)
      return this.getMaxTranslationCount(textArr, allowTranslationCount, midCount)
    }
  }
}
