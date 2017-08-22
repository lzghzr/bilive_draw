import * as http from 'http'
import * as url from 'url'
import * as querystring from 'querystring'
import * as fs from 'fs'
import * as ws from 'ws'
// import * as mongoose from 'mongoose'
import * as tools from './lib/tools'
// import { ApiKeyModel } from './mongo/apikeys'
import { options } from './options'
import { drawMap, rootOrigin } from './index'
/**
 * WebSocket服务
 * 
 * @export
 * @class WSServer
 */
export class WSServer {
  private _wsServer: ws.Server
  private _clients: Map<string, Set<ws>> = new Map()
  /**
   * 启动WebSocket服务
   * 
   * @memberof WSServer
   */
  public Start() {
    this._WebSocketServer()
    this._Loop()
  }
  /**
   * 循环
   * 
   * @private
   * @memberof WSServer
   */
  private _Loop() {
    for (let apiKey in options) {
      let clients = this._clients.get(apiKey)
        , apiData = options[apiKey]
      if (clients != null && apiData.status) {
        let draw = drawMap[apiKey].draw
          , drawing = drawMap[apiKey].drawing
        if (apiData.gif != null && apiData.gif.build === 1 && draw.length === 0 && drawing.length === 0) apiData.gif.build = 0
        for (let client of clients) {
          let cxy = draw.pop()
          if (cxy != null) {
            let [c, x, y] = cxy.split(',')
            client.send(JSON.stringify({ x, y, c }))
            clients.delete(client)
            drawing.push(cxy)
            setTimeout(() => {
              if (client.readyState === ws.OPEN) {
                let clients = this._clients.get(client.protocol)
                if (clients != null && options[apiKey].status) clients.add(client)
                else client.close()
              }
            }, 190000)
            setTimeout(() => {
              if (cxy != null && drawing.includes(cxy)) {
                drawing.splice(drawing.indexOf(cxy), 1)
                draw.push(cxy)
              }
            }, 10000)
          }
          else break
        }
      }
    }
    setTimeout(() => {
      this._Loop()
    }, 1000)
  }
  /**
   * WebSocket服务
   * 
   * @private
   * @memberof WSServer
   */
  private _WebSocketServer() {
    if (fs.existsSync('/dev/shm/bilive_draw.sock')) {
      fs.unlinkSync('/dev/shm/bilive_draw.sock')
    }
    let httpServer = http.createServer((req, res) => {
      res.writeHead(200)
      if (req.url != null) {
        let query = querystring.parse(url.parse(req.url).query)
        if (query.cmd === 'online' && query.apiKey != null && this._clients.has(query.apiKey)) {
          let clients = this._clients.get(query.apiKey)
          if (clients != null) res.end(`${clients.size}\n`)
        }
        else if (query.cmd === 'online' && query.apiKey === 'admin') res.end(`${this._wsServer.clients.size}\n`)
        else res.end('All glory to WebSockets!\n')
      }
      else res.end('All glory to WebSockets!\n')
    })
    httpServer.listen('/dev/shm/bilive_draw.sock')
    fs.chmodSync('/dev/shm/bilive_draw.sock', '666')
    // 不知道子协议的具体用法
    this._wsServer = new ws.Server({
      server: httpServer,
      handleProtocols: protocols => {
        let protocol: string = protocols[0],
          apiData = options[protocol]
        if (apiData != null && apiData.status) return protocol
        else return false
      }
    })
    this._wsServer
      .on('connection', this._WsConnectionHandler.bind(this))
      .on('error', tools.Log)
    this._WebSocketPing()
  }
  /**
   * 处理连接事件
   * 
   * @private
   * @param {ws} client 
   * @param {http.RequestOptions} req 
   * @memberof WSServer
   */
  private _WsConnectionHandler(client: ws, req: http.IncomingMessage) {
    let remoteAddress = req.headers['x-forwarded-for']
      , useragent = req.headers['user-agent']
      , apiKey = client.protocol
      , apiData = options[apiKey]
    if (apiData != null && apiData.status) {
      // 分api存储
      if (this._clients.has(apiKey)) {
        let clients = this._clients.get(apiKey)
        if (clients == null) clients = new Set([client])
        else clients.add(client)
      }
      else {
        let clients = new Set([client])
        this._clients.set(apiKey, clients)
      }
      client.on('close', () => {
        let clients = this._clients.get(apiKey)
        if (clients != null) clients.delete(client)
      })
        .on('error', tools.Log)
      // 记录连接地址
      tools.Log(apiKey, remoteAddress, useragent)
    }
  }
  /**
   * Ping/Pong
   * 
   * @private
   * @memberof WSServer
   */
  private _WebSocketPing() {
    this._wsServer.clients.forEach(client => {
      if (client.readyState === ws.OPEN) client.ping()
    })
    setTimeout(() => {
      this._WebSocketPing()
    }, 6e4) // 60秒
  }
}
/**
 * 消息格式
 * 
 * @interface message
 */
interface message {
  x: number
  y: number
  c: string
}