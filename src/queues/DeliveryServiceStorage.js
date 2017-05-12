'use-strict'

import mongoose from 'mongoose'
import { keccak_256 } from 'js-sha3'
import {
  DELIVERY_SERVICE_RECORD_STORE_SINGLE
} from '../jobs'

export default class DeliveryServiceStorage {
  constructor(queue, storageProvider) {
    this.queue = queue
    this.storageProvider = storageProvider
  }

  runAll = () => {
    this.storeSingleVerifiableClaim()
  }

  storeSingleVerifiableClaim = () => {
    this.queue.process(DELIVERY_SERVICE_RECORD_STORE_SINGLE, async (job, done) => {
      const id = job.data.id,
            hash = job.data.hash,
            verifiableClaim = job.data.verifiableClaim,
            VCEmbed = this.storageProvider.getNewVCSchema(hash, verifiableClaim)

      const query = { id },
            update = { id, $push: { verifiableClaims: VCEmbed } },
            options = { upsert: true, new: true, setDefaultsOnInsert: false }

      try {
        const record = await this.storageProvider.getChildModel().findOneAndUpdate(query, update, options)
        return done(null, true) // do not return whole record, might be huge
      } catch (e) {
        return done(new Error(e))
      }
    })
  }
}