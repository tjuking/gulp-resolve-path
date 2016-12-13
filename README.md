# gulp-resolve-path
gulp插件——解决模板和静态资源编译后相对路径定位的问题，目前可支持对html、css和js的解析

### 使用示例

目录结构：

```
--client (源文件目录)
----widget
------index
--------index.html
--------index.css
--------index.js
--------img
----------logo.png
--public (静态资源编译后的目录)
----widget
------index
--------index.css
--------index.js
--------img
----------logo.png
--views (模板编译后的目录)
----widget
------index.html
--gulpfile.js (gulp编译文件)

```

在HTML中定位资源

```html
    
    <link rel="stylesheet" href="./index.css"/>
    
    <img src="./img/logo.png"/>
    
    <script src="./index.js"></script>

```

在JS中定位资源

```javascript

    var logo = __uri("./img/logo.png"); // => "client/widget/index/img/logo.png"

```

在CSS中定位资源

```css

    .logo {
        background: url("./img/logo.png"); /* => "client/widget/index/img/logo.png" */
    }

```

在gulpfile.js文件中的处理

```javascript

var gulp = require("gulp");
var replace = require('gulp-replace');
var resolvePath = require("gulp-resolve-path");
var options = {
    /*
     root: process.cwd(),
     ext: {
     template: ['html'],
     script: ['js'],
     style: ['css', 'less', 'sass']
     }
     */
};

//静态资源的编译发布，这里做了简化处理
gulp.task("static", function () {
    return gulp.src(["client/**/**.png", "client/**/**.css", "client/**/**.js"])
        .pipe(resolvePath(options))
        .pipe(replace("/client/", "/public/"))
        .pipe(gulp.dest("public"));
});

//模板的编译发布
gulp.task("template", function () {
    return gulp.src("client/**/**.html")
        .pipe(resolvePath(options))
        .pipe(replace("/client/", "/public/"))
        .pipe(gulp.dest("views"));
});
    
```