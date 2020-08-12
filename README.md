#view-engine

>一步一步地去实现自己地模版引擎。  
>用法请看 `/script/usage.js`  
>模版模式请看 `/blade` 下的内容

# 编写一个NodeJS版的Laravel模版渲染引擎

### 需求驱动力
在搭建自己的个人博客站点的时候，在技术栈和框架的选择上思考和学习了很久，因为前端的内容越来越多，
技术框架琳琅满目，怎么去选择一个适合自己需求的框架都需要花费时间成本去挑选和学习，
这无形之中就给自己增加了不少的工作量。  
因为要考虑到如果希望自己的文章和站点能被别人搜索到的话，那可能还是得需要考虑SEO的问题，
所以`MVVM`的模式可能并不适用（未去考核百度搜索是否已经支持单页网站的爬虫，因为貌似有一些单页网站也可以通过百度搜索），
首先可能会考虑到使用万能的MVC模式，然后备选的方案还有`React ssr`和`Next.JS`等优秀的方案，
在我通过初步的尝试之后，还是选了`MVC`的模式，后续再考虑是否迭代成别的模式。

### 外因驱动力
在选定MVC模式之后，就去了解了目前市面上NodeJS的引擎模版，优秀的模版有很多，
通过搜索最多的就是`ejs`、`Jade`、`pug`等，但是我在看模版的时候，`Jade`和`pug`直接让我懵了，
即使它们是非常优秀的模版引擎，但是实在是让我爱不起来，然后ejs的话整体上没有很大的问题，
但是这依然不是我心目中最佳的选择，这可能跟我的工作经验有关系吧，先入为主。
因为我曾经和一些PHP的后端人员一起工作过，当时的MVC模式是用的PHP的`Laravel`框架，
所以让我记忆尤甚的就是这个框架的写法，模块化的模版引入，中括号的数据驱动填充模式都比较符合我的理想，
然后在查资料的过程中看到一篇文章（找不到了暂时先不贴链接，找到了再补）介绍如何自己实现一个ejs模版引擎，
在这篇文章的指引下了解了引擎的基本思想，然后就动手开撸自己的定制引擎。

### 模版引擎的基本思想
下面是百度百科的定义
    
>模板引擎的实现方式有很多，最简单的是“置换型”模板引擎，这类模板引擎只是将指定模板内容（字符串）
>中的特定标记（子字符串）替换一下便生成了最终需要的业务数据（比如网页）。
>置换型模板引擎实现简单，但其效率低下，无法满足高负载的应用需求（比如有海量访问的网站），
>因此还出现了“解释型”模板引擎和“编译型”模板引擎等。

模版引擎其实就是我们在编写了完静态的网站html之后，通过埋点，
然后再通过后台渲染填充数据生成不一样的html内容后返回给浏览器展示。  
其实很好理解，我们就是读取了模版文件，然后对字符串进行亿点点处理就可以了。

### 模版引擎的基本语法
我们来看一看Laravel的模版引擎语法的思想
```html
@extend(xxx.blade)

@import(xxx.blade)

@for ($i = 0; $i < 10; $i++)
    <div>The current value is {{ $i }}</div>
@endfor

@foreach ($users as $user)
    <p>This is user {{ $user->id }}</p>
@endforeach
```
还有很多语法和关键词的，有兴趣的可以去Laravel的官方文档查看，我这里只是举了一部分我会用到的例子，
可以看到语法上的埋点关键词就是 `@keyword` ，然后数据驱动就是双大括号 `{{ value }}` ,
我们就围绕这两个关键点去实现我们的模版引擎。  

### 实现过程

####简单实现
我会一步一步慢慢去剖析我的思路过程  
首先，我们来看一下数据驱动的语法
```html
<div>Hello, {{name}}</div>
```
其实很简单，就是把 `{{name}}` 替换成 `name` 这个变量，但是参数是不确定的，所以我们要把参数提取出来，
我们可以写一个简单的正则去匹配，所以我们先写一个简单的 `parser`
```javascript
//为了能携带更多自定义的变量，我们使用props来携带内容
function parser(blade, props) {
    //这个正则是匹配{{}}里的所有内容
    const reVariable = /{{([^}]+)}}/g;

    blade = blade.replace(reVariable, ((substring, statement) => {
        return props[statement];
    }));

    return blade;
}

let temp = parser('<div>Hello {{you}}, I am {{me}}</div>', {you: 'Tom', me: 'Lance Lee'});
console.log(temp); //<div>Hello Tom, I am Lance Lee</div>
```
通过这个我们就可以实现把 `{{name}}` 的内容替换成数据了，如果你的页面是单页面的，那就这么一个函数就足够了。  

#### 拓展条件语句

但是我们的实际需求肯定不是这么简单的过程，我们希望能通过 `for` 循环来渲染一个列表，
通过 `if` 、 `else` 语句来选择渲染不同的内容， 下面我们改一下我们的模版
```html
<ul>
    @for(let i = 0; i < props.list.length; i++)
        @if(props.list[i].show)
            <li>{{props.list[i].content}}</li>
        @else
            <li>empty</li>
        @endif
    @endfor
</ul>
```
这时候我们就要考虑处理 `for` 语句和 `if` 语句了，其实也不难，因为我们可以直接把语句的逻辑提出来，
当作是js来执行，那如果只是通过上面那种用正则替换内容肯定是达不到能执行脚本的效果的，
那么我们怎么去执行一段字符串代码呢？  
如果你是大神的话，相信你一堆会想到了，那就是eval，但是eval一直以来都是备受别人的骂名的，
因为这个用不好的话会导致脚本逻辑很混乱，而且会有执行不安全来源的内容带来的安全和性能问题，
还有什么办法呢，那就是 `Function` 了。  
我们可以通过 `new Function(fnString)` 的形式去创建一个函数。

>new Function ([arg1[, arg2[, ...argN]],] functionBody)  

就是前面的是函数的参数，可以申明多个，最后一个参数就是函数的主体。  
有了如此神器之后，我们就可以开撸了。  
但是我们希望这个函数是什么样的呢，我们先构思一下，如果有 `jQuery` 或者原生编程经验的人会比较了解，
下面我举个例子,就以上面那个模版来举例子
```javascript
function template(props) {
    let temp = [];
    temp.push('<ul>');
    for(let i = 0; i < props.list.length; i++) {
        if(props.list[i].show) {
            temp.push('<li>'+ props.list[i].content +'</li>');
        } else {
            temp.push('<li>empty</li>');
        }
    }   
    temp.push('</ul>');
    return temp.join('');
}
```
我们就是希望我们的模版编写之后，能通过我们的引擎去生成这样的函数，然后我们就可以通过调用这个函数，
传递不一样的参数 `props` ,就能生成不一样的html内容。  
有了这个概念之后，我们就清晰多了，然后我们就开始编写我们的引擎函数。
可能会有大神可以通过 `AST` 来实现，但是我暂时没有研究那么深，我们就简单地从字符串的处理开始。
```javascript
function parser(blade) {
    //定义两个函数，分别处理数据驱动和条件语句驱动
    function handleCondition(condition, statement) {
        //对条件语句的特殊符合进行处理
        statement = statement ? statement.replace(/&lt;|&gt;|&amp;/g, ((substring) => {
            return ({
                '&lt;': '<',
                '&gt;': '>',
                '&amp;': '&'
            })[substring];
        })) : statement;

        switch (condition) {
            case 'if':
                fn.push('if ' + statement + ' {\n');
                break;
            case 'elseif':
                fn.push('} else if ' + statement + ' {\n');
                break;
            case 'else':
                fn.push('} else {\n');
                break;
            case 'endif':
                fn.push('}\n');
                break;
            case 'for':
                fn.push('for ' + statement + ' {\n');
                break;
            case 'endfor':
                fn.push('}\n');
                break;
        }
    }

    function handleVariable(snippet) {
        //因为我们用单引号'来拼接内容，所以我们要对单引号进行特殊处理
        snippet = snippet.trim().replace(/'/g, "\\'");
        snippet = snippet.replace(reVariable, ((substring, statement) => {
            return "' +" + statement + "+ '"
        }));
        fn.push("temp.push('" + snippet + "');\n");
    }

    const reVariable = /{{([^}]+)}}/g;
    //这里新增一个正则，用来匹配@keyword(statement)
    //如果不清楚Regex的建议可以先去MDN看一下文档，了解一下exec的运行
    const reCondition = /@(if|elseif|else|endif|for|endfor)(\([^)]*\))?/g;
    let fn = []; //用来缓存函数主体

    let match, cursor = 0;

    fn.push('let temp = [];\n');
    while (match = reCondition.exec(blade)) {
        handleVariable(blade.slice(cursor, match.index));
        handleCondition(match[1], match[2]);
        cursor = match.index + match[0].length;
    }
    handleVariable(blade.slice(cursor));
    fn.push('return temp.join("")');

    return fn.join('');
}
```
这就是最后实现的驱动函数，看不懂的可以跟着我的思路去自己实现一下，放到浏览器去执行，
下面我们来验证一下，经过这个函数处理后的模版会得到什么
```javascript
let blade =
    `<ul>
        @for(let i = 0; i < props.list.length; i++)
            @if(props.list[i].show)
                <li>{{props.list[i].content}}</li>
            @else
                <li>empty</li>
            @endif
        @endfor
    </ul>`;

let template = parser(blade);
console.log(template);
/* 
let temp = [];
temp.push('<ul>');
for (let i = 0; i < props.list.length; i++) {
temp.push('');
if (props.list[i].show) {
temp.push('<li>' +props.list[i].content+ '</li>');
} else {
temp.push('<li>empty</li>');
}
temp.push('');
}
temp.push('</ul>');
return temp.join("")
*/
```
最终的内容没有缩进，但是我做了换行的处理，也比较能看清楚逻辑了。  
可以看到，跟我们上面写的几乎无异，这个就是我们的函数主体里面的内容，
然后我们就可以通过 `Function` 构造函数来创建一个模版函数，执行模版函数之后就会得到我们的html内容。
```javascript
let fnTemplate = new Function('props', template);
let scope = {};
let props = {
    list: [
        {show: true, content: '1'},
        {show: true, content: '2'},
        {show: false, content: '3'},
        {show: true, content: '4'},
    ]
};
//通过call来调用，我们还可以指定this的指向，然后可以在模版里面使用this.xxx填充数据
let html = fnTemplate.call(scope, props);
console.log(html);
//<ul><li>1</li><li>2</li><li>empty</li><li>4</li></ul>
```
到这里我们就基本上完成了一个引擎，但是这个引擎还是有点不足，我们再拓展一下。

#### 拓展模版
有时候在页面里面会有很多重复的内容部分，例如 `Header` 标题栏、 `Nav` 导航栏、
`Footer` 、 `Layout` 框架等，我们希望能通过单一的文件来进行统一管理，
然后我们修改内容的时候就能做到同步，结构也会比较清晰等，这也比较符合 `React` 的编程理念。  
首先我们还是先构思一下我们的模版是什么样的。  
layout.html
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>{{this.title}}</title>
    @section(meta)
    @section(style)
</head>
<body>
<div id="layout">
    @import(header)
    @section(content)
    @import(footer)
</div>
@section(script)
</body>
</html>
```
这是一个简单的Layout，我们可以通过创建header、footer，然后可以通过@import引入。  
header.html
```html
<header><h1>{{this.title}}</h1></header>
```
page.html
```html
@extend(layout)

@section(style)
<link rel="stylesheet" href="/style/page.css">
@show

@section(content)
<div id="main">{{this.content}}</div>
@show

@section(script)
<script type="text/javascript">console.log('{{props.script}}');</script>
@show
```
我们先来捋一下思路，先看layout.html，我们是通过@section来埋点，
然后在page.html的时候通过把@section和@show里面的内容填充到埋点的地方，然后还能通过@import来引入外部内容，
然后我们先人工地去捋一下我们希望得到的模版函数，和模版执行后得到的内容
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>{{this.title}}</title>
    <link rel="stylesheet" href="/style/page.css">
</head>
<body>
<div id="layout">
    <header><h1>{{this.title}}</h1></header>
    <div id="main">{{this.content}}</div>
</div>
<script type="text/javascript">
console.log('run script');
</script>
</body>
</html>
```
下面是最后的函数编写的解析函数
```javascript
function parser(blade, inner, section) {
    function parserExt() {
        const reExtend = /@(extend|section|show)(\([^)]*\))?/g;
        let matchExt = reExtend.exec(blade);
        let cursor = matchExt.index + matchExt[0].length;
        let current = '';
        let section = {};

        let match = reExtend.exec(blade);
        while (match) {
            if (match[1] === 'section') {
                current = match[2].replace(reBrackets, '');
            } else if (match[1]) {
                let snippet = blade.slice(cursor, match.index);
                section[current] = parser(snippet, true);
            }
            cursor = match.index + match[0].length;
            match = reExtend.exec(blade);
        }

        let layout = parser(getBlade(matchExt[2].replace(reBrackets, '')), true, section);

        fn.push(...layout);
    }

    function parserTemp() {
        function handleCondition(condition, statement) {
            statement = statement ? statement.replace(/&lt;|&gt;|&amp;/g, ((substring) => {
                switch (substring) {
                    case '&lt;':
                        return '<';
                    case '&gt;':
                        return '>';
                    case '&amp;':
                        return '&';
                }
            })) : statement;

            switch (condition) {
                case 'section':
                    let name = statement.replace(reBrackets, '');
                    if (section[name]) fn.push(...section[name]);
                    break;
                case 'import':
                    fn.push(...parser(getBlade(statement.replace(reBrackets, '')), true));
                    break;
                case 'if':
                    fn.push('if ' + statement + ' {\n');
                    break;
                case 'elseif':
                    fn.push('} else if ' + statement + ' {\n');
                    break;
                case 'else':
                    fn.push('} else {\n');
                    break;
                case 'endif':
                    fn.push('}\n');
                    break;
                case 'for':
                    fn.push('for ' + statement + ' {\n');
                    break;
                case 'endfor':
                    fn.push('}\n');
                    break;
                case 'define':
                    cursor = match.index + match[0].length;
                    match = reCondition.exec(blade);
                    fn.push(blade.slice(cursor, match.index).replace(/@n/g, '\n').replace(/@p/g, "\'"));
                    break;
            }
        }

        function handleVariable(snippet) {
            snippet = snippet.trim().replace(/'/g, "\\'");
            snippet = snippet.replace(reVariable, (substring, statement) => {
                return "' + " + statement + " + '"
            });
            fn.push("temp.push('" + snippet + "');\n");
        }

        const reCondition = /@(section|import|if|elseif|else|endif|for|endfor|defined|define)(\([^)]*\))?/g;
        const reVariable = /{{([^}]+)}}/g;

        let match = reCondition.exec(blade);
        let cursor = 0;

        while (match) {
            handleVariable(blade.slice(cursor, match.index));
            handleCondition(match[1], match[2]);
            cursor = match.index + match[0].length;
            match = reCondition.exec(blade);
        }
        handleVariable(blade.slice(cursor));
    }

    blade = blade.trim();
    section = section || {};
    let isExt = reExt.test(blade);
    let fn = [];
    !inner && fn.push('let temp = [];');
    isExt ? parserExt() : parserTemp();
    !inner && fn.push('return temp.join("")');
    return fn;
}
```
基本思路就是对语句进行拓展，如果你有什么想法或者有什么特殊的情况要进行处理，可以自己加处理的逻辑

### 总结

这就是我实现一个模版引擎的整体思路，其实我最终并不是让大家都去写一个类似Laravel的框架，
而是大家有了这么一个思路之后，就可以进行编写自己的模版引擎，不管你喜欢什么样的语法和模版，
都可以通过自己的代码去实现，而且可以自己优化。  
我这个模版是还不够完善，例如我们对模版的拓展，支持更多的代码语法等。  
然后也有大神可以通过 `AST` 来进行语法分析、完善整个编译过程，以后如果我有时间的话也会往这方向去学习，
然后再回来完善自己的框架内容。  
如果有什么疑问或者觉得我哪里说得不够好，都可以给我留言指出，毕竟我跟大神的距离还是很遥远的。  