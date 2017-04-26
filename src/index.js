'use-strict'

/* base libs */
import kue from 'kue'
import Web3 from 'web3'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
/* libs / modules */
import Logger from './logger'
import StorageFactory from './storage'
import { EisWorker, EisEventWatcher } from './eis.job'
/* const/utils */
import { eisJob } from './jobs'
import registryAbi from 'identity-service-wrapper/contracts/registry.abi'
import registryAddress from 'identity-service-wrapper/contracts/registry.addr'

// make .env variable available
// to process.env as very-first thing
dotenv.config()

// init storage provider
const StorageProvider = new StorageFactory().init()

// init Ethereum provider
const EthProvider = new Web3(new Web3.providers.HttpProvider('http://' + process.env.ETH_TX_HOST + ':' + process.env.ETH_TX_PORT))
// init Digital Registry Smart Contract instance
const RegistrySC = EthProvider.eth.contract(registryAbi),
      RegistryInstance = RegistrySC.at([registryAddress])

// get the queue instance
const queue = kue.createQueue({jobEvents: false})

// spin up dashboard and REST API
kue.app.set('title', 'ECD Jobs Service')
kue.app.listen(3000)

// run the process worker for EIS job
queue.process(eisJob, async (job, done) => {
  const objectId = mongoose.Types.ObjectId(job.data.objectId)
  try {
    // create DID
    const txid = await EisWorker(job.data.address)
    // fire up the wathcher
    const result = await EisEventWatcher(RegistryInstance)
    // store did 
    const successful = StorageProvider.getChildModel().findByIdAndUpdate(objectId, { did: result.args.did, ddo: result.args.ddo || '' }).exec()

    if (successful)
      return done(null, txid)
    else
      return done(new Error('Coult not store child in API v2 datasource'))

  } catch (e) {
    return done(new Error(e))
  }
})

// run events logger
Logger(queue)


