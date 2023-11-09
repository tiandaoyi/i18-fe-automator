# 介绍

前端代码国际化工具，自动转换$hxt格式。

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
> 这里的ce5b42是6位hash随机数，以页面路径唯一，用来区分同一个项目下不同页面的相同中文情况，方便产品进行处理

```vue
<template>
  <div :label="$hxt({key: 'ce5b42-label', desc:'标签'})" :title="1 + $hxt(${key: 'ce5b42-title', desc: '标题'})">
  </div>
</template>
<script>
export default {
  methods: {
    handleClick() {
      console.log($hxt({key: 'ce5b42-hello', desc: '你好'}))
    },
  },
}
</script>
```

### 开发指南

给用户看的普通日志，log.info()
-v: 给用户看的更多日志，log.verbose()
-d: 给开发者看的debug日志，log.debug()
