import { createServer } from 'node:http'
import handler from './handler.js'
const port = Number(process.env.API_PORT || 8787)
createServer(handler).listen(port, '127.0.0.1', () => console.log(`API listening at http://127.0.0.1:${port}/api/health`))
