import * as tools from './lib/tools'
import { CommentClient, DRAW_UPDATE } from './lib/comment_client'
import { WSServer } from './wsserver'
import { options } from './options'
import { numFont } from './font'
export class BiliDraw {
  constructor() {
  }
  /**
   * 弹幕服务器
   * 
   * @private
   * @type {CommentClient}
   * @memberof BiliDraw
   */
  private _commentClient: CommentClient
  /**
   * WebSocket服务
   * 
   * @private
   * @type {WSServer}
   * @memberof BiliDraw
   */
  private _WSServer: WSServer
  /**
   * 开始
   * 
   * @memberof BiliDraw
   */
  public async Start() {
    this._GifLoop()
    this._ClockLoop()
    await this._GetBitmap()
    this._commentClient = new CommentClient(5446)
    this._commentClient.on('DRAW_UPDATE', (dataJson: DRAW_UPDATE) => {
      let x = dataJson.data.x_min
        , y = dataJson.data.y_min
      for (let apiKey in options) {
        if (options[apiKey].status) {
          let bitmapData = options[apiKey]
          if (x >= bitmapData.x && x < bitmapData.x + bitmapData.width && y >= bitmapData.y && y < bitmapData.y + bitmapData.height) {
            let i = x - bitmapData.x + (y - bitmapData.y) * bitmapData.width
              , c = bitmapData.data[i]
              , draw = drawMap[apiKey].draw
              , drawing = drawMap[apiKey].drawing
            if (c !== 'Z') {
              let cxy = `${c},${x},${y}`
              if (c !== dataJson.data.color) { if (!draw.includes(cxy)) draw.push(cxy) }
              else if (draw.includes(cxy)) draw.splice(draw.indexOf(cxy), 1)
              else if (drawing.includes(cxy)) drawing.splice(drawing.indexOf(cxy), 1)
            }
          }
        }
      }
    })
      .Connect()
    this._WSServer = new WSServer()
    this._WSServer.Start()
    setInterval(() => {
      this._GetBitmap()
    }, 600000)
  }
  /**
   * 获取像素图
   * 
   * @private
   * @memberof BiliDraw
   */
  private async _GetBitmap() {
    let bitmap = await tools.XHR<string>({ uri: `${rootOrigin}/activity/v1/SummerDraw/bitmap` }).catch(tools.Log)
    if (bitmap != null) {
      let bitmapData = await tools.JsonParse<bitmap>(bitmap).catch(tools.Log)
      if (bitmapData != null) {
        let drawBitmap = bitmapData.data.bitmap
        for (let apiKey in options) {
          let apiData = options[apiKey]
          if (apiData.status) {
            let apiDraw: string[] = []
            for (let i in <any>apiData.data) {
              let dxmap = this._GetXY(parseInt(i), apiData.width)
                , x = apiData.x + dxmap.x
                , y = apiData.y + dxmap.y
                , c = apiData.data[i]
                , di = x + y * 1280
              if (c !== 'Z' && c !== drawBitmap[di]) apiDraw.push(`${c},${x},${y}`)
            }
            apiDraw.sort()
            if (drawMap[apiKey] == null) drawMap[apiKey] = { draw: apiDraw, drawing: [] }
            else drawMap[apiKey].draw = apiDraw
          }
        }
      }
    }
    else this._GetBitmap()
  }
  /**
   * GIF
   * 
   * @private
   * @memberof BiliDraw
   */
  private _GifLoop() {
    for (let apiKey in options) {
      let apiData = options[apiKey]
      if (apiData.status && apiData.gif != null) {
        let gifData = apiData.gif
        if (apiData.data === '') {
          apiData.data = gifData.bitmaps[gifData.index]
          gifData.build = 1
        }
        if (gifData.build === 0) {
          gifData.index += 1
          if (gifData.index >= gifData.bitmaps.length) gifData.index = 0
          tools.Log(apiKey, 'index', gifData.index)
          gifData.build = 2
          setTimeout(async () => {
            if (gifData != null) {
              tools.Log(apiKey, 'building', gifData.index);
              apiData.data = gifData.bitmaps[gifData.index]
              await this._GetBitmap()
              gifData.build = 3
            }
          }, gifData.cooltime * 60000)
        }
        if (gifData.build === 3) gifData.build = 1
      }
    }
    setTimeout(() => {
      this._GifLoop()
    }, 10000)
  }
  /**
   * 时钟
   * 
   * @private
   * @memberof BiliDraw
   */
  private _ClockLoop() {
    for (let apiKey in options) {
      let apiData = options[apiKey]
      if (apiData.status && apiData.clock != null) {
        let apiClock = apiData.clock
        if (apiData.gif != null && apiClock.wait && apiData.gif.build === 1) continue
        let cstTime = Date.now() + 2.88e7
          , cst = new Date(cstTime)
          , cstHours = cst.getUTCHours() < 10 ? `0${cst.getUTCHours()}` : cst.getUTCHours().toString()
          , cstMin = cst.getUTCMinutes() < 10 ? `0${cst.getUTCMinutes()}` : cst.getUTCMinutes().toString()
          , nowTime = cstHours + cstMin
        if (nowTime !== apiClock.lastTime) {
          let timeStr = ''
          for (let i = 0; i < 5; i++) {
            let tempStr = ''
            for (let j = 0; j < 4; j++) {
              tempStr += numFont[nowTime[j]].slice(i * 3, i * 3 + 3)
              if (j === 1) {
                if (i % 2 === 0) tempStr += '111'
                else tempStr += '101'
              }
              else if (j !== 3) tempStr += '1'
            }
            tempStr = tempStr.replace(/[01]/g, (word) => {
              if (word === '0') return apiClock.color
              else if (word === '1') return apiClock.bcolor
              else return word
            })
            timeStr += tempStr
            apiData.data = apiData.data.slice(0, apiClock.offsetX + (apiClock.offsetY + i) * apiData.width) + tempStr + apiData.data.slice(apiClock.offsetX + (apiClock.offsetY + i) * apiData.width + 17, apiData.data.length)
          }
          if (apiClock.data !== '') {
            let draw = drawMap[apiKey].draw
            for (let i in <any>timeStr) {
              if (timeStr[i] !== apiClock.data[i]) {
                let dxmap = this._GetXY(parseInt(i), 17)
                  , x = apiData.x + apiClock.offsetX + dxmap.x
                  , y = apiData.y + apiClock.offsetY + dxmap.y
                  , c = timeStr[i]
                  , cxy = `${c},${x},${y}`
                if (!draw.includes(cxy)) draw.push(cxy)
              }
            }
          }
          apiClock.lastTime = nowTime
          apiClock.data = timeStr
        }
      }
    }
    setTimeout(() => {
      this._ClockLoop()
    }, 500)
  }
  /**
   * 获取像素在像素图内坐标
   * 
   * @private
   * @param {number} px 
   * @param {number} width 
   * @returns 
   * @memberof BiliDraw
   */
  private _GetXY(px: number, width: number) {
    let x = px % width
      , y = Math.floor(px / width)
    return { x, y }
  }
}
export let drawMap: drawMap = {}
export let rootOrigin = 'https://api.live.bilibili.com'
interface bitmap {
  code: 0
  msg: string
  message: string
  data: { bitmap: string }
}
/**
 * 设置
 * 
 * @export
 * @interface drawMap
 */
export interface drawMap {
  [index: string]: drawMapBitmap
}
export interface drawMapBitmap {
  draw: string[]
  drawing: string[]
}