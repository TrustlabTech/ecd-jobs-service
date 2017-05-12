'use-strict'

/* base libs */
import kue from 'kue'
import Web3 from 'web3'
import dotenv from 'dotenv'
dotenv.config()
const gethHostLocation = 'http://' + process.env.ETH_TX_HOST + ':' + process.env.ETH_TX_PORT
/* libs / modules */
import Logger from './logger'
import StorageFactory from './storage'
import IdentityServiceQueue from './queues/IdentityService'
import DeliveryServiceQueue from './queues/DeliveryService'

// init storage provider
export const StorageProvider = new StorageFactory().init()
// init Ethereum provider
export const EthProvider = new Web3(new Web3.providers.HttpProvider(gethHostLocation))

// get the queue instance
const Queue = kue.createQueue({jobEvents: false})

// spin up dashboard and REST API
kue.app.set('title', 'ECD Jobs Service')
kue.app.listen(3000)

// run events logger
Logger(Queue)

// run workers
new IdentityServiceQueue(Queue, EthProvider, StorageProvider).init().runAll()
new DeliveryServiceQueue(Queue, EthProvider, StorageProvider).init().runAll()
