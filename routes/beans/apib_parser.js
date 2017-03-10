/**
 * Created by wzx 2017/02/28
 */
exports.parseApi = parseApi;

const drafter = require('drafter');
/**
 * 解析api
 * @param data api blueprint 文本
 * @param callBack function (err, apiArr) apiArr包含api blueprint中包含的请求数组，err不为空则出错
 * apiArr:[{href:'',hrefName:'',title:'',hrefVariables:[{"element": "String","content": "post_id"}],subTitle:''
 *          ,tip:'',method:'',response:{},param:{}}]
 */
function parseApi(data, callBack) {
    if (!data) {
        callBack("null", []);
        return;
    }

    const options = {
        generateSourceMap: false,
        requireBlueprintName: false
    };

    drafter.parse(data, options, function (err, result) {
        const apiArr = [];
        if (err) {
            callBack(err, apiArr);
            console.log(err);
        } else {
            // console.log(JSON.stringify(result));
            getResource(result, apiArr);
            callBack(err, apiArr);
        }
    });
}

/**
 * resource 对应着一组Transition，含有共同的url地址(href)和标题(title)，若url地址中含有可替换的路径({...})则取出hrefVariables <p>
 * 例：正常是对应着请求Method 为POST，GET，PUT...的一组请求
 * @param data api blueprint 文本
 * @param filledArr 被填充的数组
 */
function getResource(data, filledArr) {
    if (data && data.element && data.element == 'resource') {

        const param = {
            'href': data.attributes.href,
            hrefName: camelCase(data.attributes.href),
            'title': data.meta.title
        };
        if (data.attributes && data.attributes.hrefVariables) {
            getHrefVariables(data.attributes.hrefVariables, param);
        }
        getTransition(data, param, filledArr);
    } else if (data && data.content) {
        forEach(data.content, function (dataContent, index) {
            getResource(dataContent, filledArr);
        })
    }
}

function camelCase(input) {
    if (typeof input !== 'string') {
        return input;
    }

    return input.replace(/\/{\w*\}/g, '').replace(/\/(.)/g, function (match, group1) {
        return group1.toUpperCase();
    });
}

/**
 * transition 对应着一组HttpTransaction，含有共同的业务(以subTitle体现)
 * 注：若url地址中含有可替换的路径({...})则取出hrefVariables （这个地方和getResource()都需要处理）
 * 例：对应着相同业务下不同参数类型（json和纯文本）提交到服务端
 * @param data api blueprint 文本
 * @param param 共有的属性
 * @param filledArr 被填充的数组
 */
function getTransition(data, param, filledArr) {
    if (data && data.element && data.element == 'transition') {

        if (data.attributes && data.attributes.hrefVariables) {
            getHrefVariables(data.attributes.hrefVariables, param);
        }

        if (data.meta && data.meta.title) {
            param.subTitle = data.meta.title;
        }

        forEach(data.content, function (dataContent, index) {
            if (dataContent.element && dataContent.element == 'httpTransaction') {
                filledHttpTransaction(dataContent, param, filledArr);
            }
        })
    } else if (data && data.content) {
        forEach(data.content, function (dataContent, index) {
            getTransition(dataContent, param, filledArr);
        })
    }
}

/**
 * 获取可替换的路径({...}) {"element": "String","content": "post_id"}
 * @param data api blueprint 文本
 * @param param 填充对象
 */
function getHrefVariables(data, param) {
    if (data && data.content) {
        param.hrefVariables = [];
        forEach(data.content, function (dataContent, index) {
            if (dataContent.content && dataContent.content.key) {
                param.hrefVariables.push(dataContent.content.key);
            }
        })
    }
}

/**
 * HttpTransaction 包含request和response，包含请求method（PUT，GET...）
 *
 * 注：本代码在此处认定为是一个请求实体，所以实例化对象并放入共有的属性，最后push到数组中
 *
 * @param data api blueprint 文本
 * @param param 共有的属性
 * @param filledArr 被填充的数组
 */
function filledHttpTransaction(data, param, filledArr) {
    const holder = {};
    copyProperties(param, holder);

    filledArr.push(holder);

    forEach(data.content, function (dataContent, index) {
        if (dataContent.element && dataContent.element == 'httpRequest') {
            if (dataContent.attributes) {
                holder.method = dataContent.attributes.method;
                if (dataContent.meta && dataContent.meta.title) {
                    holder.tip = dataContent.meta.title;
                }
            }
            getRequestParam(dataContent, holder)
        } else if (dataContent.element && dataContent.element == 'httpResponse') {
            getResponseData(dataContent, holder);
        }
    })
}

/**
 * 获取请求参数
 * @param data api blueprint 文本
 * @param holder 填充对象
 */
function getRequestParam(data, holder) {
    if (data && data.element && data.element == 'asset') {
        try {
            holder.param = JSON.parse(data.content.toString());
        } catch (e) {
            holder.param = data.content.toString();
        }
        // console.error(JSON.stringify(holder.param));
    } else if (data && data.content) {
        forEach(data.content, function (dataContent, index) {
            getRequestParam(dataContent, holder);
        })
    }
}

/**
 * 获取响应数据
 * @param data api blueprint 文本
 * @param holder 填充对象
 */
function getResponseData(data, holder) {
    if (data && data.element && data.element == 'asset') {
        try {
            holder.response = JSON.parse(data.content.toString());
        } catch (e) {
            holder.response = data.content.toString();
        }
        // console.error(JSON.stringify(holder.response));
    } else if (data && data.content) {
        forEach(data.content, function (dataContent, index) {
            getResponseData(dataContent, holder);
        })
    }
}

function forEach(arr, callback) {
    if (arr && arr instanceof Array) {
        for (var i = 0, len = arr.length; i < len; i++) {
            callback(arr[i], i);
        }
    }
}

function copyProperties(from, to) {
    for (key in from) {
        to[key] = from[key];
    }
}