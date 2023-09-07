# 介绍

前端代码国际化工具，自动转换$t格式。

## 安装

```
npm i i18-fe-automator -g
```

## 使用

在项目根目录执行下面命令

```
fe-it
```

## 指令参数

| 参数              | 类型    | 默认值                 | 描述                                                                                   |
| ----------------- | ------- | ---------------------- | -------------------------------------------------------------------------------------- |
| -i, --input       | String  | 'src'                  | 指定待提取的文件目录。                                                                 |
| -o, --output      | String  | ''                     | 输出转换后文件路径。没有值时表示完成提取后自动覆盖原始文件。当有值时，会输出到指定目录 |
| -c, --config-file | String  | ''                     | 指定命令行配置文件的所在路径（可以自定义更多功能）                                     |
| --localePath      | String  | './locales/zh-CN.json' | 指定提取的中文语言包所存放的路径。                                                     |
| -v,--verbose      | Boolean | false                  | 控制台打印更多调试信息                                                                 |
| -h,--help         | Boolean | false                  | 查看指令用法                                                                           |
| --skip-extract    | Boolean | false                  | 跳过 i18n 转换阶段。                                                                   |
| --skip-translate  | Boolean | false                  | 跳过中文翻译阶段。                                                                     |
| --locales         | Array   | ['en-US']              | 根据中文语言包自动翻译成其他语言。用法例子 --locales en zh-CHT                         |
| --incremental     | Boolean | false                  | 开启后。支持将文件中提取到中文键值对，追加到原有的中文语言包。                         |
| --exportExcel     | Boolean | false                  | 开启后。导出所有翻译内容到 excel。 默认导出到当前目录下的 locales.xlsx                 |
| --excelPath       | String  | './locales.xlsx'       | 指定导出的 excel 路径。                                                                |

### vue 转换示例

转换前

```vue
<template>
  <div :label="'标签'" :title="1 + '标题'">
    <p title="测试注释">内容</p>
    <button @click="handleClick('信息')">点击</button>
  </div>
</template>

<script>
export default {
  methods: {
    handleClick() {
      console.log('点了')
    },
  },
}
</script>
```

转换后

```vue
<template>
  <div :label="$t({key: '', desc:'标签'})" :title="1 + $t(${key: '', desc: '标题'})">
  </div>
</template>
<script>
export default {
  methods: {
    handleClick() {
      console.log(this.$t({key: '', desc: '点了'}))
    },
  },
}
</script>
```
