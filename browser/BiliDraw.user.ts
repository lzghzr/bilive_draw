// ==UserScript==
// @name        bilibili夏日绘板
// @namespace   https://github.com/lzghzr/bilive_draw/browser
// @version     0.0.4
// @author      lzghzr
// @description 组队一起画呀
// @supportURL  https://github.com/lzghzr/bilive_draw/issues
// @match       *://api.live.bilibili.com/feed*
// @license     MIT
// @grant       none
// @run-at      document-end
// ==/UserScript==

class BiliDraw {
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  public apiKey: string
  public wsc: WebSocket
  public color = {
    '0': 'rgb(0, 0, 0)',
    '1': 'rgb(255, 255, 255)',
    '2': 'rgb(170, 170, 170)',
    '3': 'rgb(85, 85, 85)',
    '4': 'rgb(254, 211, 199)',
    '5': 'rgb(255, 196, 206)',
    '6': 'rgb(250, 172, 142)',
    '7': 'rgb(255, 139, 131)',
    '8': 'rgb(244, 67, 54)',
    '9': 'rgb(233, 30, 99)',
    'A': 'rgb(226, 102, 158)',
    'B': 'rgb(156, 39, 176)',
    'C': 'rgb(103, 58, 183)',
    'D': 'rgb(63, 81, 181)',
    'E': 'rgb(0, 70, 112)',
    'F': 'rgb(5, 113, 151)',
    'G': 'rgb(33, 150, 243)',
    'H': 'rgb(0, 188, 212)',
    'I': 'rgb(59, 229, 219)',
    'J': 'rgb(151, 253, 220)',
    'K': 'rgb(22, 115, 0)',
    'L': 'rgb(55, 169, 60)',
    'M': 'rgb(137, 230, 66)',
    'N': 'rgb(215, 255, 7)',
    'O': 'rgb(255, 246, 209)',
    'P': 'rgb(248, 203, 140)',
    'Q': 'rgb(255, 235, 59)',
    'R': 'rgb(255, 193, 7)',
    'S': 'rgb(255, 152, 0)',
    'T': 'rgb(255, 87, 34)',
    'U': 'rgb(184, 63, 39)',
    'V': 'rgb(121, 85, 72)'
  }
  public Start() {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', '/activity/v1/SummerDraw/status')
    xhr.onload = ev => {
      let res = JSON.parse((<XMLHttpRequest>ev.target).responseText)
      if (res.code === 0 && res.data.user_valid) {
        if (res.data.time === 0) this._Connet()
        else {
          console.log(`CD中, ${res.data.time}秒后连接`)
          setTimeout(() => {
            this._Connet()
          }, res.data.time * 1000)
        }
      }
      else console.log('无效用户')
    }
    xhr.send()
  }
  private _Connet() {
    this.wsc = new WebSocket('服务器地址', this.apiKey)
    this.wsc.onopen = () => { console.log('连接成功') }
    this.wsc.onmessage = this._Draw.bind(this)
    this.wsc.onclose = this._Close.bind(this)
  }
  private _Draw(data) {
    let dataInfo = <dataInfo>JSON.parse(data.data)
      , x = dataInfo.x
      , y = dataInfo.y
      , c = dataInfo.c
    let xhr = new XMLHttpRequest()
    xhr.open('POST', '/activity/v1/SummerDraw/draw')
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
    xhr.onload = ev => {
      let res = JSON.parse((<XMLHttpRequest>ev.target).responseText)
      if (res.code === 0) console.log(`坐标 x: ${x}, y: ${y}, 颜色 c: %c■ %c填充完毕`, `color:${this.color[c]};`, '')
      else console.log(`坐标 x: ${x}, y: ${y}, 颜色 c: %c■ %c填充失败`, `color:${this.color[c]};`, '')
    }
    xhr.send(`x_min=${x}&y_min=${y}&x_max=${x}&y_max=${y}&color=${c}`)
  }
  private _Close() {
    setTimeout(() => {
      this.Start()
    }, 3000)
  }
}
window['Draw'] = (apiKey: string) => {
  const biliDraw = new BiliDraw(apiKey)
  biliDraw.Start()
}
interface dataInfo {
  x: number
  y: number
  c: string
}