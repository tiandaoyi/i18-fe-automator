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
| -v,--verbose      | Boolean | false                  | 控制台打印更多调试信息                                                        |

### vue 转换示例

转换前

```vue
<template>
  <div :label="'标签'" :title="1 + '标题'">
    <button @click="handleClick('信息')">点击</button>
  </div>
</template>

<script>
export default {
  methods: {
    handleClick() {
      console.log('你好')
    },
  },
}
</script>
```

转换后

```vue
<template>
  <div :label="$t({key: 'ce5b42-label', desc:'标签'})" :title="1 + $t(${key: 'tx2hco-title', desc: '标题'})">
  </div>
</template>
<script>
export default {
  methods: {
    handleClick() {
      console.log($t({key: 'gm319e-hello', desc: '你好'}))
    },
  },
}
</script>
```
