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