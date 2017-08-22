import { XHR } from './draw/lib/tools'

const data = {
  x: parseInt(process.argv[2]),
  y: parseInt(process.argv[3]),
  w: parseInt(process.argv[4]),
  h: parseInt(process.argv[5])
}
XHR<string>({ uri: 'https://api.live.bilibili.com/activity/v1/SummerDraw/bitmap' })
  .then(resolve => {
    let draw = JSON.parse(resolve).data.bitmap
      , a = ''
    for (let y = data.y; y < data.y + data.h; y++) {
      for (let x = data.x; x < data.x + data.w; x++) {
        let dx = y * 1280 + x
          , c = draw[dx]
        a += c
      }
      a += '\\\n'
    }
    console.log(a)
  })