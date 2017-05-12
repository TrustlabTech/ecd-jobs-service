'use-strict'

import mongoose from 'mongoose'
import {
  IDENTITY_SERVICE_CENTRES_STORAGE,
  IDENTITY_SERVICE_CHILDREN_STORAGE,
  IDENTITY_SERVICE_PRACTITIONERS_STORAGE,
} from '../jobs'

export default class IdentityServiceStorageQueue {
  constructor(queue, storageProvider) {
    this.queue = queue
    this.storageProvider = storageProvider
  }

  runAll = () => {
    this.storeCentre()
    this.storeChildren()
    this.storePractitioner()
  }

  storeChildren = () => {
    this.queue.process(IDENTITY_SERVICE_CHILDREN_STORAGE, async (job, done) => {
      
      const objectId = mongoose.Types.ObjectId(job.data.objectId),
            did = job.data.did,
            ddo = job.data.ddo || ''

      try {
        const record = await this.storageProvider.getChildModel().findByIdAndUpdate(objectId, { did, ddo }).exec()
        // TODO: FIX RETURN VALUES
        return done(null, { did: record.did, ddo: record.ddo })
      } catch (e) {
        return done(new Error(e))
      }     
    })
  }

  storeCentre = () => {
    this.queue.process(IDENTITY_SERVICE_CENTRES_STORAGE, async (job, done) => {

      const id = job.data.id,
            did = job.data.did,
            ddo = job.data.ddo,
            eth = job.data.eth,
            query = { id },
            update = { id, did, ddo, eth },
            options = { upsert: true, new: true, setDefaultsOnInsert: false }
      
      try {
        const record = await this.storageProvider.getCentreModel().findOneAndUpdate(query, update, options)
        return done(null, { did: record.did, ddo: record.ddo })
      } catch (e) {
        return done(new Error(e))
      }
    })
  }

  storePractitioner = () => {
    this.queue.process(IDENTITY_SERVICE_PRACTITIONERS_STORAGE, async (job, done) => {

      const id = job.data.id,
            did = job.data.did,
            ddo = job.data.ddo,
            eth = job.data.eth,
            query = { id },
            update = { id, did, ddo, eth },
            options = { upsert: true, new: true, setDefaultsOnInsert: false }
      
      try {
        const record = await this.storageProvider.getPractitionerModel().findOneAndUpdate(query, update, options)
        return done(null, { did: record.did, ddo: record.ddo })
      } catch (e) {
        return done(new Error(e))
      }
    })
  }
}