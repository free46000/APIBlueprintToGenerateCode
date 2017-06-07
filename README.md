自动化解析API Blueprint文档的模板代码生成工具，为了提高开发效率，本工具使用nodejs开发，vue.js作为可定制化的输出模板的辅助（目前只实现了java的实体类和请求接口类的模板）。

## 下载与使用
#### 普通方式
- 下载[APIBlueprintToGenerateCode]源码，需要注意源码使用ECMAScript6的语法
- 在源码目录下执行`npm install`命令，安装依赖包，本过程中在会有一些`安装 .NET Framework 2.0 `的相关错误提示，可以忽略
- 安装完成后在源码目录下执行`node bin/www`命令，启动服务器
- 在浏览器地址栏中输入`http://localhost:3000`即可访问页面，页面中可以自定义Api文档Git地址，如果Api文档没有上传Git，也可以把Api文档拷贝到页面输入框指定的路径下，可以自动识别，点击生成按钮，解析结果会展现在当前页面中

注意：源码中是过滤了以`.apib`结尾的文件列表，此处如果有需要可以联系作者，修改为传递参数控制

#### docker容器方式
- 由于代码定制化比较强，这里我会把`DockerFile`贴出来，大家有需要可以修改代码后自行build


## 效果截图
#### entities效果
![entities](https://github.com/free46000/cloud/raw/master/apiblueprint/entities.png)
#### apiset效果
![apiset](https://github.com/free46000/cloud/raw/master/apiblueprint/apiset.png)

## 主要流程
- 通过[nodegit]拉取API Blueprint文档到本地（当然这一步视大家的具体情况，也可以直接把Api文档拷贝到页面输入框指定的路径下）
- 通过[drafter]官方解析库解析API Blueprint文档，drafter解析后的结构并不是太友好，这里需要写一些适配代码
- 解析Response中的`json`数据结构
- 借助`vue.js`生成`html`的模板代码
- 整合到docker容器

## 源码解析

#### API文档git下载
API Blueprint是一套基于markdown的API描述语言规范，基于此规范可以方便的生成mock接口，这样前端，移动端，后端可以并行开发，好处多多，希望大家也多使用。
- [nodegit地址][nodegit]
- 使用`Git.Clone`克隆API Blueprint文档
- 使用`Repository.fetchAll`fetch到最新文档
- 根据具体情况使用`Repository.mergeBranches`合并分支，源码中是把develop分支代码合并到master中，代码逻辑在`git_handler.js`中

#### 解析API Blueprint
- [drafter地址][drafter]
- 使用`node`的`fs`模块，读取文件列表，源码中是过滤了下以`.apib`结尾的文件列表，此处如果有需要可以联系作者，修改为传递参数控制
- 使用`drafter.parse`解析API Blueprint文档，解析后的格式为

```
{
  "element": "parseResult",
  "content": [
    {
      "element": "category",
      "meta": {
        "classes": [
          "api"
        ],
        "title": ""
      },
      "content": [
         {
          "element": "category",
          "meta": {
            "classes": [
              "resourceGroup"
            ],
            "title": ""
          },
          "content": [

        ... ...

}
```
- 可以发现上面的结构嵌套比较深，后面使用的时候会比较麻烦，这里把有效数据拿到，并为每个HttpTransaction生成一个实体（JsonObject），处理逻辑在`apib_parser.js`中，解析之后的格式为：
```
[{
    href:'',//请求路径:/get/task/{taskid}
    hrefName:'',//路径对应name:GetTask
    title:'',//请求标题：获取任务
    hrefVariables:[ //路径对应Variable"content": "taskid"
        {"element": "String","content": "post_id"}
    ],
    subTitle:'',//请求标题：通过id获取任务
    tip:'',//相关提示
    method:'',//请求类型 POST or GET ...
    response:{},//响应实体{'taskId':1,'taskName':'任务'}
    param:{}//请求参数taskId
}]
```
- 我们可以很方便的从上面拿到请求响应的数据，正常情况下会是json格式的，例如：`{'taskId':1,'taskName':'任务'}`,
- 以上几步是在`nodejs`的服务端完成，通信采用`ajax`，取得数据后我们把HttpTransaction中请求响应的`json`数据转换为对生成实体类友好的结构，处理逻辑主要在`to_bean.js`中，处理之后的格式为：
```
[{
    className: className,//实体类中名字
    fields: [{ //实体类中含有的属性列表
        name: taskName,
        type: String
    }],
    importTypes: [{//需要import的类型列表
        'java.util.List'
    }]
}]
```
#### 模板生成    
- 经过以上的准备，得到了我们需要的数据，然后借助`vue.js`渲染`html`代码模板,代码都在`bean_template.html`中，目前写了java实体类和Api接口类的模板，可自行扩展其他模板。下面贴出一段实体类的模板代码：
``` html
<div id="bean" v-if="beans">
    <div :id="bean.className" style="background: cornsilk">
        <p>package com.bean.response;</p>

        <p v-for="imp in bean.importTypes">import {{imp}};</p>

        <p>public class {{ bean.className }} {</p>
        <div v-for="field in bean.fields">
            private {{field.type}} {{field.name}};
        </div>
        <div v-for="field in bean.fields">
            public void set{{ firstToUpperCase(field.name) }}({{field.type}} {{ field.name }}) {<br>
            this.{{field.name}} = {{field.name}};<br>
            }<br><br>
            public {{field.type}} get{{ firstToUpperCase(field.name) }}() {<br>
            return this.{{field.name}};<br>
            }<br><br>
        </div>
        <p>}</p>
    </div>
</div>
```
#### docker整合
- 最后整合在docker容器中，docker可以让应用程序布署在软件容器下的工作可以自动化进行，不过开发接触的偏少一些，有兴趣的可以了解一下，下面我贴出我的`DockerFile`代码：
```
# 选择image
FROM node:latest

# 创建源码目录并设置当前工作路径
RUN mkdir -p /usr/app
WORKDIR /usr/app

# 拷贝源码到目标路径
COPY ./bin /usr/app/bin
COPY ./public /usr/app/public
COPY ./routes /usr/app/routes
COPY ./views /usr/app/views
COPY ./app.js /usr/app/app.js
COPY ./package.json /usr/app/package.json

RUN npm install .

CMD [ "node", "/usr/app/bin/www" ]
```

## 总结
目前代码只是在html中进行输出，本来计划下一步在指定目录生成类文件，但是有两个问题没有办法很好解决，所以就暂时放弃了，一是实体类的命名；还有实体类去重，例如：任务列表和详情接口同样都会有任务的实体，自动化生成代码会生成两个类。   

本项目主要是为了熟悉`NodeJS` `vue`等前端开发知识，娱乐为主，主要写写实现的思路，虽然写的比较简陋，但是里面用了一些比较好的开源组件`API Blueprint` `nodegit` `docker` 等，非常值得学习，欢迎留言交流，希望可以帮助到大家。
 
最后请允许打个小广告：作者开源了一个一个优雅的实现多类型的RecyclerView类库 支持DataBinding Form表单录入，Github地址：[https://github.com/free46000/MultiItem](https://github.com/free46000/MultiItem)

[APIBlueprintToGenerateCode]:https://github.com/free46000/APIBlueprintToGenerateCode.git
[nodegit]: https://github.com/nodegit/nodegit
[nodegit api]:http://www.nodegit.org/api/
[drafter]:https://github.com/apiaryio/drafter
