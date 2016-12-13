# gulp-resolve-path
gulp插件——解决编译前后文件路径定位的问题，目前可支持对html、css和js的解析

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
----------banner.png
--public (静态资源编译后的目录)
----widget
------index
--------index.css
--------index.js
--------img
----------banner.png
--views (模板编译后的目录)
----widget
------index.html
--gulpfile.js (gulp编译文件)

```

在HTML中定位资源

```html

    <img src="./img/banner.png"> <!-- => "client/widget/index/img/banner.png" -->

```

在JS中定位资源

```javascript

    var img = __uri("./img/banner.png"); // => "client/widget/index/img/banner.png"

```

在CSS中定位资源

```css

    .banner {
        background: url("./img/banner.png"); /* => "client/widget/index/img/banner.png" */
    }

```

在gulpfile.js文件中的处理

```javascript

    var gulp = require("gulp");
    var revCollector = require('gulp-rev-collector');
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
    var revOptions = {
         dirReplacements: { //文件内容里字符串的替换对应关系，也可以使用其它插件来处理
             "client/widget": "/public/widget"
         }
    };

    //静态资源的编译发布，这里做了简化处理
    gulp.task("static", function(){
        return gulp.src(["client/**/**.png", "client/**/**.css", "client/**/**.js"])
               .pipe(resolvePath(options))
               .pipe(revCollector(revOptions))
               .pipe(gulp.dest("public"));
    });

    //模板的编译发布
    gulp.task("templates", function(){
        return gulp.src("client/**/**.html")
               .pipe(resolvePath(options))
               .pipe(revCollector(revOptions))
               .pipe(gulp.dest("views"));
    });
    
```