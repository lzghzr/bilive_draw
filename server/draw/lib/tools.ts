import * as fs from 'fs'
import { inflate } from 'zlib'
import * as request from 'request'
/**
 * 添加request头信息
 * 
 * @export
 * @template T
 * @param {request.Options} options
 * @returns {Promise<T>}
 */
export function XHR<T>(options: request.Options): Promise<T> {
  // 开启gzip压缩
  options.gzip = true
  // 添加头信息
  let headers = {
    'user-agent': 'Mozilla/5.0 BiliDroid/4.34.0 (bbcallen@gmail.com)',
    'referer': 'https://live.bilibili.com/'
  }
  if (options.method === 'POST') headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
  if (options.headers == null) options.headers = headers
  else Object.assign(options.headers, headers)
  // 返回异步request
  return new Promise<T>((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error == null) resolve(body)
      else reject(error)
    })
  })
}
/**
 * 格式化JSON
 * 
 * @export
 * @template T 
 * @param {string} text 
 * @param {((key: any, value: any) => any)} [reviver] 
 * @returns {Promise<T>} 
 */
export function JsonParse<T>(text: string, reviver?: ((key: any, value: any) => any)): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      let obj = JSON.parse(text, reviver)
      resolve(obj)
    } catch (error) { reject(error) }
  })
}
/**
 * 解压数据
 * 
 * @export
 * @param {Buffer} data 
 * @returns {Promise<Buffer>} 
 */
export function Uncompress(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    inflate(data, (error, result) => {
      if (error == null) resolve(result)
      else reject(error)
    })
  })
}
/**
 * 格式化输出, 配合PM2凑合用
 * 
 * @export
 * @param {*} [message]
 * @param {...any[]} optionalParams
 */
export function Log(message?: any, ...optionalParams: any[]) {
  console.log(`${new Date().toString().slice(4, 24)} :`, message, ...optionalParams)
}