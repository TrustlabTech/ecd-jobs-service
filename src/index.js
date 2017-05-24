'use-strict'

/* base libs */
import Web3 from 'web3'
import dotenv from 'dotenv'
import express from 'express'
import bodyParser from 'body-parser'
dotenv.config()
const gethHost = 'http://' + process.env.ETH_TX_HOST + ':' + process.env.ETH_TX_PORT
/* libs / modules */
import Queue from './Queue'
import Logger from './logger'
import StorageFactory from './storage'

// init storage provider
export const StorageProvider = new StorageFactory().init()
// init Ethereum provider
export const EthProvider = new Web3(new Web3.providers.HttpProvider(gethHost))

// get the queue instance
const queue = new Queue(EthProvider, StorageProvider)
// run events logger
Logger(queue.getEmitter())

const app = express()
    , port = process.env.JOBS_QUEUE_PORT || 3000

app.use(bodyParser.json())

const rootRouter = express.Router()
    , jobsRouter = express.Router()

jobsRouter.post('/', (req, res) => {
  if (!req.body.type)
    res.status(422).json({ success: false, message: 'type is required' })
  if (!req.body.id)
    res.status(422).json({ success: false, message: 'id is required' })
  
  queue.create(req.body.type, req.body.data)
})

// set up routes
rootRouter.use('/job', jobsRouter)
app.use('/', rootRouter)

// fire up the REST service
app.listen(port, () => {
  console.log('[INFO] Amply Jobs Service listening on port ' + port) // eslint-disable-line no-console
})

// start processing
queue.processNext()
queue.getEmitter().on('job failed', async (job) => {
  try { const record = await StorageProvider.storeFailedJob(job) } catch (e) { /* no-op */ }
})