import ProxyAgent from 'proxy-agent'
import { translate } from '@vitalets/google-translate-api'
// import log from '../../utils/log'
export async function googleTranslate(
  word: string,
  originLang: string,
  targetLang: string,
  proxy?: string | undefined
): Promise<string> {
  return new Promise((resolve, reject) => {
    const agent = ProxyAgent(proxy)
    // log.success('word-------------')
    // log.success(word)
    translate(word, {
      fetchOptions: { agent: proxy ? agent : void 0 },
      from: originLang,
      to: targetLang,
    })
      .then((res) => {
        // log.success('res.text')
        // log.success(res.text)
        resolve(res.text || '')
      })
      .catch((e: any) => {
        reject(e)
      })
  })
}
