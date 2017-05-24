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

    // init Digital Registry Smart Contract instance
    this.registryInstance = this.ethProvider.eth.contract(registryAbi).at([registryAddress])
  }

  childrenQueue = async (job) => {
    const id = job.data.id

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
    })

    return txid
  }

  centresQueue = async (job) => {
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
    })

    return txid
  }

  practitionersQueue = async (job) => {
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
    })

    return txid
  }
}