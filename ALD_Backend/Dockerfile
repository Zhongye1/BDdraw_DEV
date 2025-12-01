# 使用Node 22作为基础镜像
FROM node:22-alpine

# 安装Bun包管理器
RUN npm install -g bun

# 设置工作目录
WORKDIR /app

# 复制package.json和bun.lock
COPY package.json bun.lock ./

# 安装依赖
RUN bun install

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["bun", "run", "dev"]