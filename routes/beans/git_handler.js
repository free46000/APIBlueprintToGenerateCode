/**
 * Created by wzx 2017/03/02
 */
var Git = require("nodegit");
var fs = require("fs");

var repository;

/**
 * 检出文档，这里采用master合并develop分支代码的方式（可根据现实情况修改。目的为获取最新的api文档）
 * @param repo
 * @param callback
 */
function checkout(repo, callback) {
    repository = repo;
    repository.fetchAll().then(function () {
        return repository.mergeBranches("master", "origin/develop");
        // return checkout(commit);
    }).done(function () {
        callback();
    });
}

/**
 * 从git拉取api文档
 * @param url git url
 * @param path 文件保存路径
 * @param callback 回调方法
 */
exports.pullRepo = function (url, path, callback) {
    if (fs.existsSync(path)) {
        Git.Repository.open(path).then(function (repo) {
            return checkout(repo, callback);
        }).catch(function (err) {
            callback();
            console.log(err)
        });
    } else {
        Git.Clone(url, path).then(function (repo) {
            checkout(repo, callback);
        }).catch(function (err) {
            callback();
            console.log(err)
        });
    }
};


