'use-strict'

import mongoose from 'mongoose'
import { keccak_256 } from 'js-sha3'
import DeliveryServiceWorker from '../workers/DeliveryService'
import {
  DELIVERY_SERVICE_RECORD,
  DELIVERY_SERVICE_CONFIRM_TRANSFER,
  DELIVERY_SERVICE_RECORD_STORE_SINGLE,
} from '../jobs'

// default
const DEFAULT_UNIT_CODE = 1001

export default class DeliveryServiceQueue {
  constructor(queue, ethProvider, storageProvider) {
    this.queue = queue
    this.ethProvider = ethProvider
    this.storageProvider = storageProvider
  }

  recordListQueue = async (job) => {
    const centre = await this.storageProvider.getCentreModel().findOne({ id: job.data.centreId }).select('did').exec()
    if (!centre || !centre.did)
      throw new Error('Could not get centre DID')
    
    const centreDID = centre.did

    const centreId = job.data.centreId,
          singleClaims = job.data.singleClaims

    singleClaims.forEach(verifiableClaim => {
      const hash = keccak_256.create().update(JSON.stringify(verifiableClaim.claim)).hex()

      // db storage queue
      this.queue.create(DELIVERY_SERVICE_RECORD_STORE_SINGLE, {
        title: 'Store children verifiable claims',
        hash,
        verifiableClaim,
        id: verifiableClaim.claim.deliveredService.attendees[0].id,
      })

      // blockchain registry queue
      if (verifiableClaim.claim.deliveredService.attendees[0].attended) {
        this.queue.create(DELIVERY_SERVICE_RECORD, {
          title: 'Store verifiable claim ' + hash,
          hash,
          centreDID,
          attended: verifiableClaim.claim.deliveredService.attendees[0].attended,
          date: verifiableClaim.claim.deliveredService.attendees[0].date,
        })
      }
    })

    return true
  }

  recordQueue = async (job) => {
    const date = job.data.date,
          vchash = job.data.hash,
          centreDID = job.data.centreDID,
          attended = job.data.attended
    
    const Worker = new DeliveryServiceWorker(this.ethProvider).init(),
          recordTxid = await Worker.record(`0x${vchash}`, date, centreDID, DEFAULT_UNIT_CODE),
          initMultisigTxid = await Worker.execute(centreDID.replace('did:', ''), 1, `0x${vchash}`)

    this.queue.create(DELIVERY_SERVICE_CONFIRM_TRANSFER, {
      title: 'Complete multisig process for token transfer to ' + centreDID + ' for claim ' + vchash,
      vchash,
    })

    return { recordTxid, initMultisigTxid }
  }

  confirmQueue = async (job) => {
    const vchash = job.data.vchash
    const Worker = new DeliveryServiceWorker(this.ethProvider).init(),
          txid = await Worker.confirm(`0x${vchash}`)

    return txid
  }

  storeSingleVerifiableClaim = async (job) => {
    const id = job.data.id,
          hash = job.data.hash,
          verifiableClaim = job.data.verifiableClaim,
          VCEmbed = this.storageProvider.getNewVCSchema(hash, verifiableClaim)

    const query = { id },
          update = { id, $push: { verifiableClaims: VCEmbed } },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getChildModel().findOneAndUpdate(query, update, options)

    return true
  }
}