"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Translator_provider, _Translator_targetLocale, _Translator_providerOptions, _Translator_textLengthLimit, _Translator_separator;
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
// import { googleTranslate, youdaoTranslate, baiduTranslate } from '@ifreeovo/translate-utils'
const index_1 = require("./translate-utils/src/index");
const getAbsolutePath_1 = require("./utils/getAbsolutePath");
const log_1 = __importDefault(require("./utils/log"));
const constants_1 = require("./utils/constants");
const getLang_1 = __importDefault(require("./utils/getLang"));
const stateManager_1 = __importDefault(require("./utils/stateManager"));
const saveLocaleFile_1 = require("./utils/saveLocaleFile");
const flatObjectDeep_1 = require("./utils/flatObjectDeep");
const spreadObject_1 = require("./utils/spreadObject");
async function translateByGoogle(word, locale, options) {
    var _a;
    if (!options.google || !((_a = options.google) === null || _a === void 0 ? void 0 : _a.proxy)) {
        log_1.default.error('翻译失败，当前翻译器为谷歌，请完善google配置参数');
        process.exit(1);
    }
    try {
        return await (0, index_1.googleTranslate)(word, 'zh-CN', locale, options.google.proxy);
    }
    catch (e) {
        if (e.name === 'TooManyRequestsError') {
            log_1.default.error('翻译失败，请求超过谷歌api调用次数限制');
        }
        else {
            log_1.default.error('谷歌翻译请求出错', e);
        }
        return '';
    }
}
async function translateByYoudao(word, locale, options) {
    var _a, _b;
    if (!options.youdao || !((_a = options.youdao) === null || _a === void 0 ? void 0 : _a.key) || !((_b = options.youdao) === null || _b === void 0 ? void 0 : _b.secret)) {
        log_1.default.error('翻译失败，当前翻译器为有道，请完善youdao配置参数');
        process.exit(1);
    }
    try {
        return await (0, index_1.youdaoTranslate)(word, 'zh-CN', locale, options.youdao);
    }
    catch (e) {
        log_1.default.error('有道翻译请求出错', e);
        return '';
    }
}
function convertToCamelCase(str) {
    if (typeof str !== 'string') {
        return str;
    }
    // 去除标点符号和空格
    const cleanedStr = str.replace(/[^\w\s]|_/g, '');
    // 将字符串按空格分割为单词数组
    const words = cleanedStr.split(/\s+/);
    // 转换为大驼峰格式
    const camelCaseStr = words
        .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
        .join('');
    return camelCaseStr;
}
async function translateByBaidu(word, locale, options) {
    var _a, _b;
    if (!options.baidu || !((_a = options.baidu) === null || _a === void 0 ? void 0 : _a.key) || !((_b = options.baidu) === null || _b === void 0 ? void 0 : _b.secret)) {
        log_1.default.error('翻译失败，当前翻译器为百度，请完善baidu配置参数');
        process.exit(1);
    }
    try {
        return (await (0, index_1.baiduTranslate)(word, 'zh', locale, options.baidu));
    }
    catch (e) {
        log_1.default.error('百度翻译请求出错', e);
        return '';
    }
}
async function default_1(localePath, locales, oldPrimaryLang, options) {
    if (![constants_1.GOOGLE, constants_1.YOUDAO, constants_1.BAIDU].includes(options.translator || '')) {
        log_1.default.error('翻译失败，请确认translator参数是否配置正确');
        process.exit(1);
    }
    log_1.default.verbose('当前使用的翻译器：', options.translator);
    const primaryLangPath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), localePath);
    const newPrimaryLang = (0, flatObjectDeep_1.flatObjectDeep)((0, getLang_1.default)(primaryLangPath));
    const localeFileType = stateManager_1.default.getToolConfig().localeFileType;
    let targetContent = {};
    for (const targetLocale of locales) {
        log_1.default.info(`正在翻译${targetLocale}语言包`);
        const reg = new RegExp(`/[A-Za-z-]+.${localeFileType}`, 'g');
        const targetPath = localePath.replace(reg, `/${targetLocale}.${localeFileType}`);
        const targetLocalePath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), targetPath);
        let oldTargetLangPack = {};
        let newTargetLangPack = {};
        if (fs_extra_1.default.existsSync(targetLocalePath)) {
            oldTargetLangPack = (0, flatObjectDeep_1.flatObjectDeep)((0, getLang_1.default)(targetLocalePath));
        }
        else {
            fs_extra_1.default.ensureFileSync(targetLocalePath);
        }
        const keyList = Object.keys(newPrimaryLang);
        const willTranslateText = {};
        for (const key of keyList) {
            // 主语言同一个key的value不变，就复用原有的翻译结果
            const oldLang = (0, flatObjectDeep_1.flatObjectDeep)(oldPrimaryLang);
            const isNotChanged = oldLang[key] === newPrimaryLang[key];
            if (isNotChanged && oldTargetLangPack[key]) {
                newTargetLangPack[key] = oldTargetLangPack[key];
            }
            else {
                willTranslateText[key] = newPrimaryLang[key];
            }
        }
        // 翻译新增键值对内容
        const translator = new Translator({
            provider: options.translator || constants_1.YOUDAO,
            targetLocale,
            providerOptions: options,
        });
        console.log('待翻译的中文包', willTranslateText);
        const incrementalTranslation = await translator.translate(willTranslateText);
        newTargetLangPack = {
            ...newTargetLangPack,
            ...incrementalTranslation,
        };
        const fileContent = (0, spreadObject_1.spreadObject)(newTargetLangPack);
        const obj = {};
        // 把英文语言包内容拷贝到目标语言包
        if (targetLocale === 'en-US' || targetLocale === 'en') {
            Object.keys(fileContent).forEach((key) => {
                if (typeof fileContent[key] === 'string') {
                    // const item = convertToCamelCase(fileContent[key])
                    const item = fileContent[key];
                    obj[key] = item;
                }
                else {
                    obj[key] = fileContent[key];
                }
            });
            targetContent = obj;
        }
        (0, saveLocaleFile_1.saveLocaleFile)(obj, targetLocalePath);
        log_1.default.info(`完成${targetLocale}语言包翻译`);
    }
    return targetContent;
}
exports.default = default_1;
class Translator {
    constructor({ provider, targetLocale, providerOptions }) {
        _Translator_provider.set(this, void 0);
        _Translator_targetLocale.set(this, void 0);
        _Translator_providerOptions.set(this, void 0);
        _Translator_textLengthLimit.set(this, 5000);
        _Translator_separator.set(this, '\n'); // 翻译文本拼接用的分隔符
        switch (provider) {
            case constants_1.YOUDAO:
                __classPrivateFieldSet(this, _Translator_provider, translateByYoudao, "f");
                break;
            case constants_1.GOOGLE:
                __classPrivateFieldSet(this, _Translator_provider, translateByGoogle, "f");
                break;
            case constants_1.BAIDU:
                __classPrivateFieldSet(this, _Translator_provider, translateByBaidu, "f");
        }
        __classPrivateFieldSet(this, _Translator_targetLocale, targetLocale, "f");
        __classPrivateFieldSet(this, _Translator_providerOptions, providerOptions, "f");
    }
    async translate(dictionary) {
        const allTextArr = Object.keys(dictionary).map((key) => dictionary[key]);
        let restTextBundleArr = allTextArr;
        log_1.default.success(`allTextArr:${allTextArr.length}`);
        log_1.default.success(`restTextBundleArr:${restTextBundleArr.length}`);
        const translationCount = 100;
        let startIndex = 0;
        const result = [];
        // 每轮循环，先判断100行key-value的字符数量
        // 如果字符小于1w，以两倍速度递增，扩大翻译行数，以尽可能翻译更多的行数
        // 如果字符大于1w，以两倍倍速度递减，扩小翻译行数，以尽可能翻译更多的行数
        // 确定了行数后开始翻译，一直循环到翻译完所有行
        while (startIndex < allTextArr.length && restTextBundleArr.length > 0) {
            const maxTranslationCount = this.getMaxTranslationCount(restTextBundleArr, 0, translationCount);
            const textBundleArr = allTextArr.slice(startIndex, startIndex + maxTranslationCount);
            restTextBundleArr = allTextArr.slice(startIndex + maxTranslationCount);
            startIndex = startIndex + maxTranslationCount;
            const [res] = await Promise.all([
                __classPrivateFieldGet(this, _Translator_provider, "f").call(this, textBundleArr.join(__classPrivateFieldGet(this, _Translator_separator, "f")), // 文本中可能有逗号，为了防止后面分割字符出错，使用\\$代替逗号
                __classPrivateFieldGet(this, _Translator_targetLocale, "f"), __classPrivateFieldGet(this, _Translator_providerOptions, "f")),
                new Promise((resolve) => {
                    log_1.default.success('3000m后执行下一批');
                    setTimeout(resolve, 3000);
                }), // 有道翻译接口限制每秒1次请求
            ]);
            let resArr;
            if (typeof res === 'object') {
                resArr = res.map((item) => item.dst);
            }
            else {
                resArr = res.split(__classPrivateFieldGet(this, _Translator_separator, "f"));
            }
            result.push(...resArr);
        }
        const incrementalTranslation = {};
        Object.keys(dictionary).forEach((key, index) => {
            // 翻译后有可能字符串前后会多出一个空格，这里做一下过滤
            let translatedText = result[index] || '';
            if (!dictionary[key].startsWith(' ') && translatedText.startsWith(' ')) {
                translatedText = translatedText.slice(1);
            }
            if (!dictionary[key].endsWith(' ') && translatedText.endsWith(' ')) {
                translatedText = translatedText.slice(0, -1);
            }
            incrementalTranslation[key] = translatedText;
        });
        return incrementalTranslation;
    }
    // 递归获取1w字以内的能够翻译的最大行数
    getMaxTranslationCount(textArr, allowTranslationCount, tryTranslationCount) {
        const textNum = textArr.length;
        const diff = Math.min(tryTranslationCount, textNum);
        const textBundleArr = textArr.slice(0, diff);
        const textBundleLength = textBundleArr.join(__classPrivateFieldGet(this, _Translator_separator, "f")).length;
        // allowTranslationCount > tryTranslationCount 是指待翻译内容一开始就超出限制字数的情况
        // allowTranslationCount === textNum 是指待翻译内容一开始就小于限制字数的情况
        if (allowTranslationCount > tryTranslationCount || allowTranslationCount === textNum) {
            return allowTranslationCount;
        }
        else if (textBundleLength <= __classPrivateFieldGet(this, _Translator_textLengthLimit, "f")) {
            return this.getMaxTranslationCount(textArr, diff, tryTranslationCount * 2);
        }
        else {
            const midCount = Math.floor((tryTranslationCount - allowTranslationCount) / 2);
            return this.getMaxTranslationCount(textArr, allowTranslationCount, midCount);
        }
    }
}
_Translator_provider = new WeakMap(), _Translator_targetLocale = new WeakMap(), _Translator_providerOptions = new WeakMap(), _Translator_textLengthLimit = new WeakMap(), _Translator_separator = new WeakMap();
