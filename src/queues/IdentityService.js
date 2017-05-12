'use-strict'

import mongoose from 'mongoose'
import EthWallet from 'ethereumjs-wallet'
import IdentityServiceStorageQueue from './IdentityServiceStorage'
import { EisWorker, EisEventWatcher } from '../workers/IdentityService'
import registryAbi from 'identity-service-wrapper/contracts/registry.abi'
import registryAddress from 'identity-service-wrapper/contracts/registry.addr'
import {
  IDENTITY_SERVICE_CENTRES,
  IDENTITY_SERVICE_CHILDREN,
  IDENTITY_SERVICE_PRACTITIONERS,
  IDENTITY_SERVICE_CENTRES_STORAGE,
  IDENTITY_SERVICE_CHILDREN_STORAGE,
  IDENTITY_SERVICE_PRACTITIONERS_STORAGE,
} from '../jobs'

export default class IdentityServiceQueue {
  constructor(queue, ethProvider, storageProvider) {
    this.queue = queue
    this.ethProvider = ethProvider
    this.storageQueue = new IdentityServiceStorageQueue(this.queue, storageProvider)
  }

  init = () => {
    // init Digital Registry Smart Contract instance
    const registryInterface = this.ethProvider.eth.contract(registryAbi)
    this.registryInstance = registryInterface.at([registryAddress])

    return this
  }

  runAll = () => {
    this.centresQueue()
    this.childrenQueue()
    this.practitionersQueue()
    
    // run the corresponding storage queue
    this.storageQueue.runAll()
  }

  childrenQueue = () => {
    this.queue.process(IDENTITY_SERVICE_CHILDREN, async (job, done) => {
      const id = job.data.id

      try {
        // create DID
        const txid = await EisWorker(job.data.address, this.ethProvider)
        // fire up the wathcher
        const result = await EisEventWatcher(this.registryInstance)
        // store did
        this.queue.create(IDENTITY_SERVICE_CHILDREN_STORAGE, {
          title: 'Store DID for child ' + id,
          id,
          did: 'did:' + result.args.did,
          ddo: result.args.ddo || '' 
        }).priority('critical').attempts(10).ttl(1000 * 5).save()

        return done(null, txid)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }

  centresQueue = () => {
    this.queue.process(IDENTITY_SERVICE_CENTRES, async (job, done) => {
      try {
        // create a new Eth keypair first
        const wallet = EthWallet.generate(),
              pubkey = wallet.getPublicKeyString(),
              privkey = wallet.getPrivateKeyString(),
              address = wallet.getAddressString()

        // create DID
        const txid = await EisWorker(address, this.ethProvider)
        // fire up the wathcher
        const result = await EisEventWatcher(this.registryInstance)
        // store did
        this.queue.create(IDENTITY_SERVICE_CENTRES_STORAGE, {
          title: 'Store DID for centre ' + job.data.id,
          id: job.data.id,
          did: 'did:' + result.args.did,
          ddo: result.args.ddo || '',
          eth: {
            pubkey,
            privkey,
            address,
          },
        }).priority('critical').attempts(10).ttl(1000 * 5).save()

        return done(null, txid)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }

  practitionersQueue = () => {
    this.queue.process(IDENTITY_SERVICE_PRACTITIONERS, async (job, done) => {
      try {
        // create a new Eth keypair first
        const wallet = EthWallet.generate(),
              pubkey = wallet.getPublicKeyString(),
              privkey = wallet.getPrivateKeyString(),
              address = wallet.getAddressString() 

        // create DID
        const txid = await EisWorker(address, this.ethProvider)
        // fire up the wathcher
        const result = await EisEventWatcher(this.registryInstance)
        // store did
        this.queue.create(IDENTITY_SERVICE_PRACTITIONERS_STORAGE, {
          title: 'Store DID for practitioner ' + job.data.id,
          id: job.data.id,
          did: 'did:' + result.args.did,
          ddo: result.args.ddo || '',
          eth: {
            pubkey,
            privkey,
            address,
          },
        }).priority('critical').attempts(10).ttl(1000 * 5).save()

        return done(null, txid)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }
}