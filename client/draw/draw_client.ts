import * as ws from 'ws'
import * as tools from './lib/tools'
import { EventEmitter } from 'events'
import { cookieJar, rootOrigin, options, userData } from './index'
/**
 * Blive客户端, 用于服务器和发送事件
 * 
 * @export
 * @class DrawClient
 * @extends {EventEmitter}
 */
export class DrawClient extends EventEmitter {
  /**
   * 创建一个 DrawClient 实例
   * 
   * @param {string} uid
   * @memberof DrawClient
   */
  constructor(uid: string) {
    super()
    this.uid = uid
    this._userData = options.usersData[uid]
  }
  /**
   * UID
   * 
   * @type {string}
   * @memberof DrawClient
   */
  public uid: string
  /**
   * 用户信息
   * 
   * @private
   * @type {userData}
   * @memberof DrawClient
   */
  private _userData: userData
  /**
   * WebSocket客户端
   * 
   * @private
   * @type {ws}
   * @memberof DrawClient
   */
  private _wsClient: ws
  /**
   * 全局计时器, 确保只有一个定时任务
   * 
   * @private
   * @type {NodeJS.Timer}
   * @memberof CommentClient
   */
  private _Timer: NodeJS.Timer
  /**
   * 连接到指定服务器
   * 
   * @memberof DrawClient
   */
  public async Connect() {
    if (this._wsClient != null && this._wsClient.readyState === ws.OPEN) return
    clearTimeout(this._Timer)
    let status = {
      method: 'GET',
      uri: `${rootOrigin}/activity/v1/SummerDraw/status`,
      jar: cookieJar[this.uid]
    }
    let statusResponseText = await tools.XHR<string>(status).catch((reject) => { tools.Log(this._userData.nickname, reject) })
    if (statusResponseText != null) {
      let statusResponse = await tools.JsonParse<statusResponse>(statusResponseText).catch((reject) => { tools.Log(this._userData.nickname, reject) })
      if (statusResponse != null) {
        if (statusResponse.code === 0 && statusResponse.data.user_valid) {
          this._Timer = setTimeout(() => {
            this._wsClient = new ws(options.apiOrigin, [options.apiKey])
            this._wsClient
              .on('error', () => { tools.Log(this._userData.nickname, '连接错误') })
              .on('open', () => { tools.Log(this._userData.nickname, '连接成功') })
              .on('close', this._ClientCloseHandler.bind(this))
              .on('message', this._MessageHandler.bind(this))
          }, statusResponse.data.time * 1000)
        }
        else if (statusResponse.code === -101) this.emit('cookieError', this.uid)
        else tools.Log(this._userData.nickname, '无效用户')
      }
    }
  }
  /**
   * 断开与服务器的连接
   * 
   * @memberof DrawClient
   */
  public Close() {
    clearTimeout(this._Timer)
    if (this._wsClient.readyState !== ws.OPEN) return
    this._wsClient.close()
    this._wsClient.removeAllListeners()
  }
  /**
   * 重新连接到服务器
   * 
   * @memberof DrawClient
   */
  public ReConnect() {
    this.Close()
    this.Connect()
  }
  /**
   * 客户端连接重试
   * 
   * @private
   * @memberof DrawClient
   */
  private _ClientReConnect() {
    this.Close()
    this._Timer = setTimeout(() => {
      this.Connect()
    }, 3e3) // 3秒
  }
  /**
   * 服务器断开重连
   * 
   * @private
   * @memberof DrawClient
   */
  private _ClientCloseHandler() {
    this.emit('clientClose', '服务器主动断开')
    this._ClientReConnect()
  }
  /**
   * 解析消息
   * 
   * @private
   * @param {string} data
   * @memberof DrawClient
   */
  private async _MessageHandler(data: string) {
    let message = await tools.JsonParse<message>(data).catch((reject) => { tools.Log(this._userData.nickname, reject) })
    if (message != null) {
      let draw = {
        method: 'POST',
        uri: `${rootOrigin}/activity/v1/SummerDraw/draw`,
        jar: cookieJar[this.uid],
        body: `x_min=${message.x}&y_min=${message.y}&x_max=${message.x}&y_max=${message.y}&color=${message.c}`
      }
      let drawResponseText = await tools.XHR<string>(draw).catch((reject) => { tools.Log(this._userData.nickname, reject) })
      if (drawResponseText != null) {
        let drawResponse = await tools.JsonParse<drawResponse>(drawResponseText).catch((reject) => { tools.Log(this._userData.nickname, reject) })
        if (drawResponse != null) {
          if (drawResponse.code === 0) tools.Log(`${this._userData.nickname} 坐标 x: ${message.x}, y: ${message.y}, 颜色 c: ${message.c} 填充完毕`)
          else if (drawResponse.code === -101) this.emit('cookieError', this.uid)
          else tools.Log(`${this._userData.nickname} 坐标 x: ${message.x}, y: ${message.y}, 颜色 c: ${message.c} 填充失败`)
        }
      }
    }
  }
}
interface message {
  x: number
  y: number
  c: string
}
interface statusResponse {
  code: number
  msg: string
  message: string
  data: {
    user_valid: boolean
    draw_status: boolean
    super_user: boolean
    time: number
    level_limit: number
  }
}
interface drawResponse {
  code: number
  msg: string
  message: string
  data: {
    time: number
  }
}