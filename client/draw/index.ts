import * as fs from 'fs'
import * as request from 'request'
import * as tools from './lib/tools'
import { AppClient } from './lib/app_client'
import { DrawClient } from './draw_client'
/**
 * 主程序
 * 
 * @export
 * @class Draw
 */
export class Draw {
  constructor() {
  }
  /**
   * 客户端Map
   * 
   * @private
   * @type {Map<string, DrawClient>}
   * @memberof Draw
   */
  private _drawClients: Map<string, DrawClient> = new Map()
  /**
   * 开始主程序
   * 
   * @memberof Draw
   */
  public async Start() {
    await this._SetOptionsFile()
    let option = await tools.Options().catch(tools.Log)
    if (option != null) {
      options = option
      let usersData = options.usersData
      for (let uid in usersData) {
        let userData = usersData[uid]
        if (userData.status) {
          if (userData.cookie === '') this._CookieError(uid)
          else {
            cookieJar[uid] = tools.SetCookie(userData.cookie, rootOrigin)
            this._AddUser(uid)
          }
        }
      }
    }
  }
  /**
   * 添加用户
   * 
   * @private
   * @param {string} uid 
   * @memberof Draw
   */
  private _AddUser(uid: string) {
    let drawClient = new DrawClient(uid)
    drawClient
      .on('cookieError', this._CookieError.bind(this))
      .Connect()
    this._drawClients.set(uid, drawClient)
  }
  /**
   * 初始化设置文件
   * 
   * @private
   * @returns {Promise<{}>} 
   * @memberof Draw
   */
  private _SetOptionsFile(): Promise<{}> {
    return new Promise((resolve, reject) => {
      fs.exists(`${__dirname}/options.json`, exists => {
        if (exists) resolve()
        else {
          fs.createReadStream(`${__dirname}/options.default.json`)
            .pipe(fs.createWriteStream(`${__dirname}/options.json`))
            .on('error', (error) => {
              reject(error)
            })
            .on('close', () => {
              resolve()
            })
        }
      })
    })
  }
  /**
   * 监听cookie失效事件
   * 
   * @private
   * @param {string} uid
   * @memberof Draw
   */
  private async _CookieError(uid: string) {
    let userData = options.usersData[uid]
    tools.Log(`${userData.nickname} Cookie已失效`)
    let cookie = await AppClient.GetCookie(userData.accessToken).catch((reject) => { tools.Log(userData.nickname, reject) })
    if (cookie != null) {
      cookieJar[uid] = cookie
      options.usersData[uid].cookie = cookie.getCookieString(rootOrigin)
      if (!this._drawClients.has(uid)) this._AddUser(uid)
      else {
        let drawClient = <DrawClient>this._drawClients.get(uid)
        drawClient.Connect()
      }
      tools.Options(options)
      tools.Log(`${userData.nickname} Cookie已更新`)
    }
    else this._TokenError(uid)
  }
  /**
   * 监听token失效事件
   * 
   * @private
   * @param {string} uid
   * @memberof Draw
   */
  private async _TokenError(uid: string) {
    let userData = options.usersData[uid]
    tools.Log(userData.nickname, 'Token已失效')
    let token = await AppClient.GetToken({
      userName: userData.userName,
      passWord: userData.passWord
    }).catch((reject) => { tools.Log(userData.nickname, reject) })
    if (token != null) {
      options.usersData[uid].accessToken = token
      if (options.usersData[uid].cookie === '') this._CookieError(uid)
      tools.Options(options)
      tools.Log(`${userData.nickname} Token已更新`)
    }
    else {
      if (this._drawClients.has(uid)) {
        let drawClient = <DrawClient>this._drawClients.get(uid)
        drawClient.Close()
        this._drawClients.delete(uid)
      }
      options.usersData[uid].status = false
      tools.Options(options)
      tools.Log(userData.nickname, 'Token更新失败')
    }
  }
}
export let rootOrigin = 'https://api.live.bilibili.com',
  cookieJar: cookieJar = {},
  options: config
/**
 * 应用设置
 * 
 * @export
 * @interface config
 */
export interface config {
  apiOrigin: string
  apiKey: string
  usersData: usersData
}
export interface usersData {
  [index: string]: userData
}
export interface userData {
  nickname: string
  userName: string
  passWord: string
  accessToken: string
  cookie: string
  status: boolean
}
export interface cookieJar {
  [index: string]: request.CookieJar
}