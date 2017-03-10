var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.redirect('/html/bean_template.html');
});

module.exports = router;