import ProxyAgent from 'proxy-agent'
import { Response } from 'got/dist/source/core/index'
const got = require('got')

export interface ChatGPTOption {
  key?: string
  proxy?: string
}

export async function chatGPTTranslate(
  word: string,
  originLang: string,
  targetLang: string,
  option: ChatGPTOption
): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions'
  const key = option.key
  const agent =
    option && option.proxy
      ? {
          http: new ProxyAgent(option.proxy),
          https: new ProxyAgent(option.proxy),
        }
      : undefined
  return new Promise((resolve, reject) => {
    got
      .post(url, {
        headers: {
          Authorization: `Bearer ${key || ''}`,
          'Content-Type': 'application/json',
        },
        json: {
          messages: [
            {
              role: 'system',
              content: `请帮我翻译，下面的文字改成${targetLang || '英文'}:
              ${word}
              `,
            },
          ],
          model: 'gpt-3.5-turbo',
        },
        agent,
      })
      .then(({ body }: Response<string>) => {
        const res = JSON.parse(body)
        if (res && res.choices && res.choices.length) {
          resolve(res.choices[0].message.content)
        } else {
          reject(body)
        }
      })
      .catch((e: any) => {
        reject(e)
      })
  })
}
