/**
 * 你画我猜大作业
 * some functions for server.js
 */


// get user's info from socket
function getSocket(s) {
    return {
        id :　s.id.substring(2),
        name : s.name,
        in : s.toPaint
    }
}

// get user's info from socket and sort the users
function getSockets(s, sort) {
    ss = s.server.sockets.sockets;
    var res = []
    for(var i in ss)
        res.push(getSocket(ss[i]));
    if(sort) {
        res = res.sort((x,y)=>{
            if(!x.in || !y.in) return 0;
            return x.in - y.in;
        });
    }
    return res;
}

// repalce the special char
function escapeHTML(data) {
    var s = '';
    for(var i = 0 ;i<data.length;i++){
        var d = data[i];
        switch (d){
            case '"':
                d = '&quot;'; break;
            case '&':
                d = '&amp;'; break;
            case '<':
                d = '&lt;'; break;
            case '>':
                d = '&gt;'; break;
            case ' ':
                d = '&nbsp;'; break;
        }
        s += d;
    }
    return s;
}

// 同时使用user来作为排行榜
function getUsers() {
    var queue = [], idmap = {}, n = 10;
    return {
        // 排行榜中加入新纪录
        set : function (id,name,val) {
            if(this.isExists(id))
                this.remove(id);
            var i = queue.findIndex(x=>{return idmap[x].val<val;});
            i = (i===-1) ? queue.length : i;
            queue.splice(i,0,id);   // 在第i个元素处插入id
            idmap[id] = {name:name, val:val};
        },
        isExists : function (id) {
            return idmap[id] != null;
        },
        remove : function (id) {
            var i = queue.indexOf(id);
            if(i !== -1) {
                queue.splice(i, 1);  // 删除i-th元素
                delete idmap[id];
                return true;
            }
            return false;
        },
        get : function (id) {
            if(this.isExists(id))
                return idmap[id];
        },
        toJSON : function () {
            var json = [];
            queue.every((x,i)=>{
                if(i >= n) return false;
                json.push({id:x, name:idmap[x].name, val:idmap[x].val});
                return true;
            });
            return json;
        }
    }
}

// show message on the command
function cmdMsg(msg,socket,game) {
    if(msg[0] === '#'){
        var msg = msg.substring(1),
            sockets = func.getSockets(socket);
        switch (msg) {
            case 'show paths':
                socket.emit('cmd', JSON.stringify(paths));
                socket.emit('server msg', '指令操作成功！');
                return true;
            case 'show users':
                socket.emit('cmd', JSON.stringify(sockets.map(x=>x=x.name)));
                socket.emit('server msg', '指令操作成功！');
                return true;
            case 'clear paths':
                paths = [];
                socket.emit('server msg', '指令操作成功！');
                socket.emit('paint paths', JSON.stringify(paths));
                return true;
            case 'show word':
                socket.emit('server msg', '指令操作成功！');
                socket.emit('cmd', JSON.stringify(game.player?game.player.word:null));
                return true;
            case 'show words':
                socket.emit('server msg', '指令操作成功！');
                socket.emit('cmd', JSON.stringify(db._db));
                return true;
        }
        if(msg.startsWith('add word')){
            var s = msg.substring(8).trim();
            s = s.split(' ');
            if(s.length===2){
                if(db.add(s[0],s[1])) {
                    db.save();
                    socket.emit('server msg', '指令操作成功！');
                }
                else
                    socket.emit('server msg','指令操作失败。');
            }else
                socket.emit('server msg','指令操作失败！');
        }else{
            return false;
        }
        return true;
    }else{
        return false;
    }
}


module.exports.escapeHTML = escapeHTML;
module.exports.getUsers = getUsers;
module.exports.getSocket = getSocket;
module.exports.getSockets = getSockets;
module.exports.cmdMsg = cmdMsg;




