/**
 * Created by wzx 2017/03/02
 */
const express = require('express');
const router = express.Router();
const gitHandler = require('./git_handler');
const apiParser = require('./apib_parser');
const fs = require('fs');
let url = "https://github.com/free46000";
let path = "apiblueprint/git/";


router.get('/', function (req, res, next) {
    path = req.query.path ? req.query.path : path;
    url = req.query.url ? req.query.url : url;

    gitPullPromise(url, path).then(function (path) {
        return getApiFileArrPromise(path);
    }).then(function (apiFileArr) {
        return getApiFileDataArrPromise(apiFileArr);
    }).then(function (apiFileDataArr) {
        return getApiArrPromise(apiFileDataArr);
    }).then(function (apiArrs) {
        //整合api的arr返回调用端
        let apiArrResult = [];
        for (let i in apiArrs) {
            apiArrResult = apiArrResult.concat(apiArrs[i]);
        }
        res.json(apiArrResult);
    }).catch(function () {
        res.json('error');
    });


});


/**
 * 从git拉取api文档
 * @param url git url
 * @param path 文件保存路径
 * @returns {Promise}
 */
function gitPullPromise(url, path) {
    return new Promise(function (resolve, reject) {
        gitHandler.pullRepo(url, path, function (err) {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(path)
        });
    });
}

/**
 * 获取该路径下符合规则（.apib结尾）的文件列表
 * @param path 文件保存路径
 * @returns {Promise}
 */
function getApiFileArrPromise(path) {
    return new Promise(function (resolve, reject) {
        fs.readdir(path, function (err, files) {
            if (err) {
                console.log(err);
                reject(err);
            }
            let apiFileArr = [];
            for (let i in files) {
                if (files[i].endsWith('.apib')) {
                    apiFileArr.push(files[i]);
                }
            }
            resolve(apiFileArr);
            console.log(apiFileArr);
        });
    });
}

/**
 * 通过文件Arr获取文件内容
 * @param apiFileArr 文件Arr
 * @returns {Promise.<*>}
 */
function getApiFileDataArrPromise(apiFileArr) {
    const promiseArr = [];
    for (let i in apiFileArr) {
        promiseArr.push(new Promise(function (resolve, reject) {
            fs.readFile(path + apiFileArr[i], function (err, data) {
                if (err) {
                    console.log(err);
                }
                resolve(data ? data.toString() : "");
            });
        }));
    }
    return Promise.all(promiseArr);
}

/**
 * 通过文件内容Arr解析并获取api的arr
 * @param apiFileDataArr 文件内容Arr
 * @returns {Promise.<*>}
 */
function getApiArrPromise(apiFileDataArr) {
    const promiseArr = [];
    for (let i in apiFileDataArr) {
        promiseArr.push(new Promise(function (resolve, reject) {
            apiParser.parseApi(apiFileDataArr[i].replace(/\r\n/g, "\n"), function (err, apiArr) {
                if (err) {
                    console.log(err);
                }
                resolve(apiArr ? apiArr : []);
            });
        }));
    }
    return Promise.all(promiseArr);
}

module.exports = router;
