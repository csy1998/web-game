# 网络游戏之你画我猜 #

**计算机网络与web技术课程大作业**
编程语言：JavaScript（node.js）

    npm install
    cd game
    node server.js
    http://localhost:3000/

### 示例运行结果
* 弹出框形式登陆进入游戏房间：

![](https://ws4.sinaimg.cn/large/006tNc79ly1fz7plwcpxej30yo0so407.jpg)

* 两名玩家进入房间并上场后，程序开始运行，由队列第一名玩家csy开始绘图：

![](https://ws4.sinaimg.cn/large/006tNc79ly1fz7pp4dt2rj30y70qt0up.jpg)

* 第二名玩家csy2回答正确，开始下一轮：

![](https://ws2.sinaimg.cn/large/006tNc79ly1fz7prhgp80j30y30qkq4w.jpg)

### 代码逻辑框架

程序主要分两大块，static里面为前端代码，外面为后端以及数据库代码；

后端（含数据库）完成游戏业务逻辑控制前端表现，包括玩家登陆、游戏的开始、画布绘图、消息框发消息、计时等；

前端完成业务逻辑在网页上的交互表现；

