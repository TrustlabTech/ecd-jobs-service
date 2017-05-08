'use-strict'

/* base libs */
import kue from 'kue'
import Web3 from 'web3'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import EthWallet from 'ethereumjs-wallet'
/* libs / modules */
import Logger from './logger'
import StorageFactory from './storage'
import { EisWorker, EisEventWatcher } from './workers/IdentityService'
/* const/utils */
import {
  IDENTITY_SERVICE_STAFF,
  IDENTITY_SERVICE_CENTRES,
  IDENTITY_SERVICE_CHILDREN,
} from './jobs'
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

// run events logger
Logger(queue)

// run workers
queue.process(IDENTITY_SERVICE_CHILDREN, async (job, done) => {
  const objectId = mongoose.Types.ObjectId(job.data.objectId)
  try {
    // create DID
    const txid = await EisWorker(job.data.address)
    // fire up the wathcher
    const result = await EisEventWatcher(RegistryInstance)
    // store did              
    const successful = StorageProvider.getChildModel()
                                      .findByIdAndUpdate(objectId, { did: 'did:' + result.args.did, ddo: result.args.ddo || '' })
                                      .exec()

    if (successful)
      return done(null, txid)
    else
      return done(new Error('Could not process Digital Identity registration for child ' + job.data.objectId))

  } catch (e) {
    return done(new Error(e))
  }
})

queue.process(IDENTITY_SERVICE_CENTRES, async (job, done) => {
  try {
    // create a new Eth keypair first
    const wallet = EthWallet.generate(),
          pubkey = wallet.getPublicKeyString(),
          privkey = wallet.getPrivateKeyString(),
          address = wallet.getAddressString() 

    // create DID
    const txid = await EisWorker(address)
    // fire up the wathcher
    const result = await EisEventWatcher(RegistryInstance)
    
    // centres might not exist yet
    const CentreModel = StorageProvider.getCentreModel(),
          query = { id: job.data.id },
          options = { upsert: true, new: true, setDefaultsOnInsert: false },
          update = {
            id: job.data.id,
            did: result.args.did,
            ddo: result.args.ddo || '',
            eth: {
              pubkey,
              privkey,
              address,
            },
          }

    const record = await CentreModel.findOneAndUpdate(query, update, options)

    if (record)
      return done(null, txid)
    else
      return done(new Error('Could not process Digital Identity registration for centre ' + job.data.id))

  } catch (e) {
    return done(new Error(e))
  }
})
