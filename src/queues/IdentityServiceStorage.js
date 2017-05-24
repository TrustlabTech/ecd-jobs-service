'use-strict'

import mongoose from 'mongoose'

export default class IdentityServiceStorageQueue {
  constructor(queue, storageProvider) {
    this.queue = queue
    this.storageProvider = storageProvider
  }

  storeCentre = async (job) => {
    const id = job.data.id,
          did = job.data.did,
          ddo = job.data.ddo,
          eth = job.data.eth,
          query = { id },
          update = { id, did, ddo, eth },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getCentreModel().findOneAndUpdate(query, update, options)
    
    return { did: record.did, ddo: record.ddo }
  }

  storeChildren = async (job) => {
    const id = job.data.id,
          did = job.data.did,
          ddo = job.data.ddo || ''

    const query = { id },
          update = { id, did, ddo },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getChildModel().findOneAndUpdate(query, update, options)
    
    return { did: record.did, ddo: record.ddo }
  }

  storePractitioner = async (job) => {
    const id = job.data.id,
          did = job.data.did,
          ddo = job.data.ddo,
          eth = job.data.eth,
          query = { id },
          update = { id, did, ddo, eth },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getPractitionerModel().findOneAndUpdate(query, update, options)

    return { did: record.did, ddo: record.ddo }
  }
}