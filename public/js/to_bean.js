/**
 * Created by wzx 2017/02/28
 */
/**
 * 解析Json，返回json中包含的属性、属性类型
 * @param text
 * @returns [{
 *   className: className,//实体类中名字
 *   fields: [{ //实体类中含有的属性列表
 *       name: taskName,
 *       type: String
 *   }],
 *   importTypes: [{//需要import的类型列表
 *       'java.util.List'
 *   }]
 * }]
 */
function generateBeanFieldFromJson(text, className) {
    //转换json对象
    let jsonObject = JSON.parse(trimStr(text));
    //如果是jsonArray去第0个位置的jo即可
    jsonObject = isArray(jsonObject) ? jsonObject[0] : jsonObject;

    return getBeansFromJsonObject(jsonObject, className);
}


/**
 * 将json对象转换成bean类
 * @param jsonObject json对象
 * @param className 类名
 * @param beanArr 被填充bean数组
 */
function getBeansFromJsonObject(jsonObject, className, beanArr) {
    beanArr = beanArr ? beanArr : [];
    const fields = [];
    for (let key in jsonObject) {
        fields.push({name: key, type: getTypeFromJsonVal(jsonObject[key], key, beanArr)})
    }

    const importTypes = [];
    for (let i in fields) {
        let type = typeCase(fields[i].type);
        if (importMap[type]) importTypes.push(importMap[type]);
    }

    className = className ? camelCaseWithFirstCharUpper(className) : 'A';
    let bean = {className: className, fields: fields, importTypes: importTypes};
    beanArr.push(bean);

    return beanArr;
}


/**
 * 从json 属性值中判断该值的数据类型
 * @param val
 * @returns {string}
 */
function getTypeFromJsonVal(val, key, beanArr) {

    //去掉空格，以避免一些无谓的转换错误
    if (val && val.replace) {
        val = val.replace(/ /g, "");
    }
    var typeofStr = typeof(val);
    if (typeofStr === 'number') {
        if (isInt(val)) {
            return "int";
        } else {
            return "double";
        }
    } else if (typeofStr === 'boolean') {
        return typeofStr;
    } else if (isDate(val)) {
        return "Date";
    } else if (!val) {
        return "String";
    } else if (typeofStr === 'string') {
        return "String";
    } else {
        if (isArray(val)) {
            var type = getTypeFromJsonVal(val[0], key, beanArr);
            return "List<" + type + ">";
        } else {
            //会走到这里，说明属性值是个json，说明属性类型是个自定义类
            var typeName = firstToUpperCase(key);
            getBeansFromJsonObject(val, typeName, beanArr);
            return typeName;

        }
    }
}


var importMap = {
    'Date': 'java.util.Date',
    'List': 'java.util.List'
}

function typeCase(input) {
    return input.replace(/<\w*>/g, '');
}

function trimStr(str) {
    return str.replace(/(^\s*)|(\s*$)/g, "");
}

function isArray(o) {
    return o instanceof Array;
}

function firstToUpperCase(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
}

function camelCase(input) {
    return input.replace(/_(.)/g, function (match, group1) {
        return group1.toUpperCase();
    });
}

function camelCaseWithFirstCharUpper(input) {
    if (!input || !input[0]) {
        return ""
    }
    input = camelCase(input);
    return input[0].toUpperCase() + input.substr(1);
}

function isDate(date) {
    return ((new Date(date) !== "Invalid Date" && !isNaN(new Date(date))) && isNaN((+date)));
}

function isInt(n) {
    return n % 1 === 0;
}
