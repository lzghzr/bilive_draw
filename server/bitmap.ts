import * as fs from 'fs'
import { PNG } from 'pngjs'
import * as tools from './draw/lib/tools'

const fileName = process.argv[2]
  , bitmap = {
    '0,0,0': '0',
    '255,255,255': '1',
    '170,170,170': '2',
    '85,85,85': '3',
    '254,211,199': '4',
    '255,196,206': '5',
    '250,172,142': '6',
    '255,139,131': '7',
    '244,67,54': '8',
    '233,30,99': '9',
    '226,102,158': 'A',
    '156,39,176': 'B',
    '103,58,183': 'C',
    '63,81,181': 'D',
    '0,70,112': 'E',
    '5,113,151': 'F',
    '33,150,243': 'G',
    '0,188,212': 'H',
    '59,229,219': 'I',
    '151,253,220': 'J',
    '22,115,0': 'K',
    '55,169,60': 'L',
    '137,230,66': 'M',
    '215,255,7': 'N',
    '255,246,209': 'O',
    '248,203,140': 'P',
    '255,235,59': 'Q',
    '255,193,7': 'R',
    '255,152,0': 'S',
    '255,87,34': 'T',
    '184,63,39': 'U',
    '121,85,72': 'V'
  }
let text = ''
  , png = new PNG({
    filterType: 4
  })
fs.createReadStream(`${fileName}.png`)
  .pipe(png)
  .on('parsed', () => {
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        let idx = (png.width * y + x) << 2
        if (png.data[idx + 3] !== 255) text += 'Z'
        else text += bitmap[[png.data[idx], png.data[idx + 1], png.data[idx + 2]].toString()]
      }
      text += '\\\n'
    }
    fs.writeFile(`${fileName}.txt`, text, tools.Log)
  })