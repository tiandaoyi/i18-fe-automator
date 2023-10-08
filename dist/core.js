"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const inquirer_1 = __importDefault(require("inquirer"));
const path_1 = __importDefault(require("path"));
const prettier_1 = __importDefault(require("prettier"));
const glob_1 = __importDefault(require("glob"));
const merge_1 = __importDefault(require("lodash/merge"));
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const transform_1 = __importDefault(require("./transform"));
const log_1 = __importDefault(require("./utils/log"));
const getAbsolutePath_1 = require("./utils/getAbsolutePath");
const collector_1 = __importDefault(require("./collector"));
const translate_1 = __importDefault(require("./translate"));
const getLang_1 = __importDefault(require("./utils/getLang"));
const constants_1 = require("./utils/constants");
const stateManager_1 = __importDefault(require("./utils/stateManager"));
const exportExcel_1 = __importDefault(require("./exportExcel"));
const exportExcelEnAndCn_1 = __importDefault(require("./exportExcelEnAndCn"));
const initConfig_1 = require("./utils/initConfig");
const saveLocaleFile_1 = require("./utils/saveLocaleFile");
const assertType_1 = require("./utils/assertType");
function isValidInput(input) {
    const inputPath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), input);
    if (!fs_extra_1.default.existsSync(inputPath)) {
        log_1.default.error(`路径${inputPath}不存在,请重新设置input参数`);
        process.exit(1);
    }
    if (!fs_extra_1.default.statSync(inputPath).isDirectory()) {
        log_1.default.error(`路径${inputPath}不是一个目录,请重新设置input参数`);
        process.exit(1);
    }
    return true;
}
function getSourceFilePaths(input, exclude) {
    if (isValidInput(input)) {
        return glob_1.default.sync(`${input}/**/*.{cjs,mjs,js,ts,tsx,jsx,vue}`, {
            ignore: exclude,
        });
    }
    else {
        return [];
    }
}
function saveLocale(localePath, collector) {
    const keyMap = collector.getKeyMap();
    const localeAbsolutePath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), localePath);
    if (!fs_extra_1.default.existsSync(localeAbsolutePath)) {
        fs_extra_1.default.ensureFileSync(localeAbsolutePath);
    }
    if (!fs_extra_1.default.statSync(localeAbsolutePath).isFile()) {
        log_1.default.error(`路径${localePath}不是一个文件,请重新设置localePath参数`);
        process.exit(1);
    }
    (0, saveLocaleFile_1.saveLocaleFile)(keyMap, localeAbsolutePath);
    log_1.default.verbose(`输出中文语言包到指定位置:`, localeAbsolutePath);
}
function getPrettierParser(ext) {
    switch (ext) {
        case 'vue':
            return 'vue';
        case 'ts':
        case 'tsx':
            return 'babel-ts';
        default:
            return 'babel';
    }
}
function getOutputPath(input, output, sourceFilePath) {
    let outputPath;
    if (output) {
        const filePath = sourceFilePath.replace(input + '/', '');
        outputPath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), output, filePath);
        fs_extra_1.default.ensureFileSync(outputPath);
    }
    else {
        outputPath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), sourceFilePath);
    }
    return outputPath;
}
function formatInquirerResult(answers) {
    if (answers.translator === constants_1.YOUDAO) {
        return {
            translator: answers.translator,
            youdao: {
                key: answers.key,
                secret: answers.secret,
            },
        };
    }
    else if (answers.translator === constants_1.BAIDU) {
        return {
            translator: answers.translator,
            baidu: {
                key: answers.key,
                secret: answers.secret,
            },
        };
    }
    else {
        return {
            translator: answers.translator,
            google: {
                proxy: answers.proxy,
            },
        };
    }
}
async function getTranslationConfig() {
    const cachePath = (0, getAbsolutePath_1.getAbsolutePath)(__dirname, '../.cache/configCache.json');
    fs_extra_1.default.ensureFileSync(cachePath);
    const cache = fs_extra_1.default.readFileSync(cachePath, 'utf8') || '{}';
    const oldConfigCache = JSON.parse(cache);
    const answers = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'translator',
            message: '请选择翻译接口',
            default: constants_1.YOUDAO,
            choices: [
                { name: '有道翻译', value: constants_1.YOUDAO },
                { name: '谷歌翻译', value: constants_1.GOOGLE },
                { name: '百度翻译', value: constants_1.BAIDU },
            ],
            when(answers) {
                return !answers.skipTranslate;
            },
        },
        {
            type: 'input',
            name: 'proxy',
            message: '使用谷歌服务需要翻墙，请输入代理地址',
            default: oldConfigCache.proxy || '',
            when(answers) {
                return answers.translator === constants_1.GOOGLE;
            },
            validate(input) {
                return input.length === 0 ? '代理地址不能为空' : true;
            },
        },
        {
            type: 'input',
            name: 'key',
            message: '请输入有道翻译appKey',
            default: oldConfigCache.key || '',
            when(answers) {
                return answers.translator === constants_1.YOUDAO;
            },
            validate(input) {
                return input.length === 0 ? 'appKey不能为空' : true;
            },
        },
        {
            type: 'input',
            name: 'secret',
            message: '请输入有道翻译appSecret',
            default: oldConfigCache.secret || '',
            when(answers) {
                return answers.translator === constants_1.YOUDAO;
            },
            validate(input) {
                return input.length === 0 ? 'appSecret不能为空' : true;
            },
        },
        {
            type: 'input',
            name: 'key',
            message: '请输入百度翻译appId',
            default: oldConfigCache.key || '',
            when(answers) {
                return answers.translator === constants_1.BAIDU;
            },
            validate(input) {
                return input.length === 0 ? 'appKey不能为空' : true;
            },
        },
        {
            type: 'input',
            name: 'secret',
            message: '请输入百度翻译appSecret',
            default: oldConfigCache.secret || '',
            when(answers) {
                return answers.translator === constants_1.BAIDU;
            },
            validate(input) {
                return input.length === 0 ? 'appSecret不能为空' : true;
            },
        },
    ]);
    const newConfigCache = Object.assign(oldConfigCache, answers);
    fs_extra_1.default.writeFileSync(cachePath, JSON.stringify(newConfigCache), 'utf8');
    const result = formatInquirerResult(answers);
    return result;
}
function formatCode(code, ext, prettierConfig) {
    let stylizedCode = code;
    if ((0, assertType_1.isObject)(prettierConfig)) {
        stylizedCode = prettier_1.default.format(code, {
            ...prettierConfig,
            parser: getPrettierParser(ext),
        });
        log_1.default.verbose(`格式化代码完成`);
    }
    return stylizedCode;
}
async function default_1(options) {
    let i18nConfig = (0, initConfig_1.getI18nConfig)(options);
    if (!i18nConfig.skipTranslate) {
        const translationConfig = await getTranslationConfig();
        i18nConfig = (0, merge_1.default)(i18nConfig, translationConfig);
    }
    // 全局缓存脚手架配置
    stateManager_1.default.setToolConfig(i18nConfig);
    const { input, exclude, output, rules, localePath, locales, skipExtract, skipTranslate, adjustKeyMap, } = i18nConfig;
    log_1.default.debug(`命令行配置信息:`, i18nConfig);
    let oldPrimaryLang = {};
    const primaryLangPath = (0, getAbsolutePath_1.getAbsolutePath)(process.cwd(), localePath);
    oldPrimaryLang = (0, getLang_1.default)(primaryLangPath);
    if (!skipExtract) {
        const cnCollector = collector_1.default.getInstance();
        log_1.default.info('正在转换中文，请稍等...');
        const sourceFilePaths = getSourceFilePaths(input, exclude);
        // const bar = new cliProgress.SingleBar(
        //   {
        //     format: `${chalk.cyan('提取进度:')} [{bar}] {percentage}% {value}/{total}`,
        //   },
        //   cliProgress.Presets.shades_classic
        // )
        const startTime = new Date().getTime();
        // bar.start(sourceFilePaths.length, 0)
        sourceFilePaths.forEach((sourceFilePath) => {
            log_1.default.verbose(`正在提取文件中的中文:`, sourceFilePath);
            const sourceCode = fs_extra_1.default.readFileSync(sourceFilePath, 'utf8');
            const ext = path_1.default.extname(sourceFilePath).replace('.', '');
            cnCollector.resetCountOfAdditions();
            cnCollector.setCurrentCollectorPath(sourceFilePath);
            const { code } = (0, transform_1.default)(sourceCode, ext, rules, sourceFilePath, {
                collector: cnCollector,
            });
            log_1.default.verbose(`完成中文提取和语法转换:`, sourceFilePath);
            // 只有文件提取过中文，或文件规则forceImport为true时，才重新写入文件
            if (cnCollector.getCountOfAdditions() > 0 || rules[ext].forceImport) {
                const stylizedCode = formatCode(code, ext, i18nConfig.prettier);
                const outputPath = getOutputPath(input, output, sourceFilePath);
                fs_extra_1.default.writeFileSync(outputPath, stylizedCode, 'utf8');
                log_1.default.verbose(`生成文件:`, outputPath);
            }
            // 自定义当前文件的keyMap
            if (adjustKeyMap) {
                const newkeyMap = adjustKeyMap((0, cloneDeep_1.default)(cnCollector.getKeyMap()), cnCollector.getCurrentFileKeyMap(), sourceFilePath);
                cnCollector.setKeyMap(newkeyMap);
                cnCollector.resetCurrentFileKeyMap();
            }
            // bar.increment()
        });
        // 增量转换时，保留之前的提取的中文结果
        if (i18nConfig.incremental) {
            const newkeyMap = (0, merge_1.default)(oldPrimaryLang, cnCollector.getKeyMap());
            cnCollector.setKeyMap(newkeyMap);
        }
        saveLocale(localePath, cnCollector);
        // bar.stop()
        const endTime = new Date().getTime();
        log_1.default.info(`耗时${((endTime - startTime) / 1000).toFixed(2)}s`);
    }
    log_1.default.success('中文转换完毕!');
    console.log(''); // 空一行
    let targetContent = {};
    if (!skipTranslate) {
        targetContent = await (0, translate_1.default)(localePath, locales, oldPrimaryLang, {
            translator: i18nConfig.translator,
            google: i18nConfig.google,
            youdao: i18nConfig.youdao,
            baidu: i18nConfig.baidu,
        });
        log_1.default.success('英文转换完毕!');
        const enCollector = collector_1.default.getInstance();
        log_1.default.success('英文JSON');
        log_1.default.success(JSON.stringify(targetContent));
        // 将$t中的中文翻译成英文后再写入项目中
        log_1.default.info('正在将$t代码中的key转成该中文(desc)对应的英文，请稍等...');
        const sourceFilePaths = getSourceFilePaths(input, exclude);
        // const bar = new cliProgress.SingleBar(
        //   {
        //     format: `${chalk.cyan('提取进度:')} [{bar}] {percentage}% {value}/{total}`,
        //   },
        //   cliProgress.Presets.shades_classic
        // )
        // bar.start(sourceFilePaths.length, 0)
        sourceFilePaths.forEach((sourceFilePath, i) => {
            // log.verbose(`正在提取文件中的英文:`, sourceFilePath)
            const sourceCode = fs_extra_1.default.readFileSync(sourceFilePath, 'utf8');
            const ext = path_1.default.extname(sourceFilePath).replace('.', '');
            enCollector.resetCountOfAdditions();
            enCollector.setCurrentCollectorPath(sourceFilePath);
            log_1.default.success('------i:' + i + sourceFilePath);
            const { code } = (0, transform_1.default)(sourceCode, ext, rules, sourceFilePath, {
                sourceContent: targetContent,
                collector: enCollector,
            });
            // log.verbose(`完成英文提取和语法转换:`, sourceFilePath)
            log_1.default.success('enCollector.getCountOfAdditions()' + enCollector.getCountOfAdditions());
            if (enCollector.getCountOfAdditions() > 0) {
                const stylizedCode = formatCode(code, ext, i18nConfig.prettier);
                const outputPath = getOutputPath(input, output, sourceFilePath);
                fs_extra_1.default.writeFileSync(outputPath, stylizedCode, 'utf8');
                // log.verbose(`生成文件:`, outputPath)
            }
            // console.log('----')
            // console.log('enCollector', enCollector.getKeyValueMap())
            // 自定义当前文件的keyMap
            if (adjustKeyMap) {
                const newkeyMap = adjustKeyMap((0, cloneDeep_1.default)(enCollector.getKeyMap()), enCollector.getCurrentFileKeyMap(), sourceFilePath);
                // console.log('newkeyMap-----', newkeyMap)
                enCollector.setKeyMap(newkeyMap);
                enCollector.resetCurrentFileKeyMap();
            }
            // bar.increment()
        });
        // bar.stop()
        (0, exportExcelEnAndCn_1.default)(enCollector.getKeyValueMap());
        log_1.default.success(`导出完毕!`);
    }
    if (i18nConfig.exportExcel) {
        log_1.default.info(`正在导出excel翻译文件`);
        (0, exportExcel_1.default)();
        log_1.default.success(`导出完毕!`);
    }
}
exports.default = default_1;
