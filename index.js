var through2 = require('through2');
var path = require('path');
var _ = require('lodash');

//默认的配置信息
var options = {
    root: process.cwd(),
    ext: {
        template: ['html'],
        script: ['js'],
        style: ['css', 'less', 'sass']
    }
};

/**
 * 入口函数（使用gulp解决编译前后文件路径的问题，目前可支持对html、css和js的解析）
 * @param userOptions [object] 传入项目编译的根目录以及需要解析文件的后缀名
 * @returns {*}
 */
function resolvePath(userOptions) {
    _.extend(options, userOptions);
    return through2.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        var fileStr = file.contents.toString(enc);
        var fileExt = getFileExt(file.path);
        if (options.ext.template.indexOf(fileExt) >= 0) {
            fileStr = extHtml(fileStr, file.path);
            file.contents = new Buffer(fileStr);
        } else if (options.ext.style.indexOf(fileExt) >= 0) {
            fileStr = extCss(fileStr, file.path);
            file.contents = new Buffer(fileStr);
        } else if (options.ext.script.indexOf(fileExt) >= 0) {
            fileStr = extJs(fileStr, file.path);
            file.contents = new Buffer(fileStr);
        }
        return cb(null, file);
    });
}

//解析html
function extHtml(content, filePath) {
    var reg = /(<script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/script\s*>|$)|(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/style\s*>|$)|<(img|embed|audio|video|link|object|source)\s+[\s\S]*?["'\s\w\/\-](?:>|$)|(\sstyle\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig;
    content = content.replace(reg, function (matched, $1, $2, $3, $4, $5, $6, $7) {
        if ($1) {//<script>
            $1 = $1.replace(/(\s(?:data-)?(src|main)\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, type, value) {
                return prefix + getResolveMatchString(value, filePath);
            });
            matched = $1 + $2;
            if ($2) { //script标签内的文本
                if (!/\s+type\s*=/i.test($1) || /\s+type\s*=\s*(['"]?)text\/javascript\1/i.test($1)) { //没有type属性或者type属性为text/javascript
                    matched = $1 + extJs($2, filePath);
                } else {
                    matched = $1 + extHtml($2, filePath);
                }
            }
        } else if ($3) { //<style>
            if ($4) { //style标签内的文本
                matched = $3 + extCss($4, filePath);
            }
        } else if ($5) { //<img|embed|audio|video|link|object|source>
            var tag = $5.toLowerCase();
            if (tag == "link") {
                matched = matched.replace(/(\s(?:data-)?href\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                    return prefix + getResolveMatchString(value, filePath);
                });
            } else if (tag == "object") {

            } else {
                matched = matched.replace(/(\s(?:data-)?src\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                    return prefix + getResolveMatchString(value, filePath);
                });
            }
        } else if ($6) { //标签的style属性
            if ($7) {
                var styleInfo = getStringValue($7);
                matched = $6 + styleInfo.prefix + extCss(styleInfo.value, filePath) + styleInfo.suffix;
            }
        }
        return matched;
    });
    return content;
}

//解析css文件
function extCss(content, filePath) {
    var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
    content = content.replace(reg, function (m, comment, url, last, filter) {
        if (url) {
            var urlInfo = getStringValue(url);
            if (m.indexOf("@") == 0) {
                m = '@import url(' + getPathToClient(urlInfo.value, filePath) + ')' + last;
            } else {
                m = 'url(' + getPathToClient(urlInfo.value, filePath) + ')' + last;
            }
        } else if (filter) {
            var filterInfo = getStringValue(filter);
            m = 'src=' + getPathToClient(filterInfo.value, filePath);
        }
        return m;
    });
    return content;
}

//解析js文件
function extJs(content, filePath) {
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]*?(?:\*\/|$))|\b(__uri)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*')\s*\)/g;
    content = content.replace(reg, function (m, comment, type, value) {
        if (type == "__uri") {
            m = getResolveMatchString(value, filePath);
        }
        return m;
    });
    return content;
}

//获得属性值里替换路径后的字符串
//'"./a.png"' => '"/client/static/base/img/a.png"'
function getResolveMatchString(value, filePath) {
    var valueInfo = getStringValue(value);
    var valuePath = getPathToClient(valueInfo.value, filePath);
    return valueInfo.prefix + valuePath + valueInfo.suffix;
}

//解析带单引号或双引号的字符串
/*
 '"./a.png"' =>
 {
 prefix: '"',
 suffix: '"',
 value: './a.png'
 }
 */
function getStringValue(value) {
    var quotPrefix = '';
    var quotSuffix = '';
    var afterValue = '';
    if (value && value.length) {
        quotPrefix = value[0] == "'" || value[0] == '"' ? value[0] : '';
        quotSuffix = value[value.length - 1] == "'" || value[value.length - 1] == '"' ? value[value.length - 1] : '';
        afterValue = value.substring(quotPrefix ? 1 : 0, quotSuffix ? value.length - 1 : value.length);
    }
    return {
        prefix: quotPrefix,
        suffix: quotSuffix,
        value: afterValue
    }
}

//文件定位到编译目录下的路径
function getPathToClient(thePath, filePath) {
    if (isRelativePath(thePath)) {
        thePath = path.resolve(path.dirname(filePath), thePath);
        thePath = thePath.substring(options.root.length);
    }
    return thePath
}

//判断是否是相对路径
function isRelativePath(thePath) {
    return !(!thePath || path.isAbsolute(thePath) || thePath.indexOf("http://") == 0 || thePath.indexOf("https://") == 0 || thePath.indexOf("<") == 0 || thePath.indexOf("data:") == 0);
}

//获取文件后缀名
function getFileExt(filePath) {
    var ext = "";
    var basename = path.basename(filePath);
    var basenameArr = basename.split(".");
    if (basenameArr && basenameArr.length) {
        ext = basenameArr[basenameArr.length - 1];
    }
    return ext;
}

module.exports = resolvePath;