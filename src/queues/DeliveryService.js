'use-strict'

import { keccak_256 } from 'js-sha3'
import DeliveryServiceWorker from '../workers/DeliveryService'
import DeliveryServiceStorageQueue from './DeliveryServiceStorage'
import {
  DELIVERY_SERVICE_RECORD,
  DELIVERY_SERVICE_RECORD_LIST,
  DELIVERY_SERVICE_INIT_TRANSFER,
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
    this.storageQueue = new DeliveryServiceStorageQueue(this.queue, this.storageProvider)
  }

  init = () => {
    return this
  }

  runAll = () => {
    this.listQueue()
    this.recordQueue()
    this.executeQueue()
    this.confirmQueue()

    // run the corresponding storage queue
    this.storageQueue.runAll()
  }

  listQueue = () => {
    this.queue.process(DELIVERY_SERVICE_RECORD_LIST, async (job, done) => {
      let centreDID = ''
      try {
        const centre = await this.storageProvider.getCentreModel().findOne({ id: job.data.centreId }).select('did').exec()
        if (!centre || !centre.did)
          throw new Error('Could not get centre DID')
        centreDID = centre.did

      } catch (e) {
        return done(new Error(e))
      }

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
        }).priority('low').attempts(10).ttl(1000 * 5).save()

        // blockchain registry queue
        if (verifiableClaim.claim.deliveredService.attendees[0].attended) {
          this.queue.create(DELIVERY_SERVICE_RECORD, {
            title: 'Store verifiable claim ' + hash,
            hash,
            centreDID,
            attended: verifiableClaim.claim.deliveredService.attendees[0].attended,
            date: verifiableClaim.claim.deliveredService.attendees[0].date,
          }).priority('high').attempts(10).ttl(1000 * 60 * 2).save()
        }
      })

      return done(null, true)
    })
  }

  recordQueue = () => {
    this.queue.process(DELIVERY_SERVICE_RECORD, async (job, done) => {
      try {
        const date = job.data.date,
              vchash = job.data.hash,
              centreDID = job.data.centreDID,
              attended = job.data.attended
        
        const Worker = new DeliveryServiceWorker(this.ethProvider).init(),
              txid = await Worker.record(vchash, date, centreDID, DEFAULT_UNIT_CODE),
              result = await Worker.getEventListener().watchRecordEvent()
          
        this.queue.create(DELIVERY_SERVICE_INIT_TRANSFER, {
          title: 'Init multisig process for token transfer to ' + centreDID + ' for claim ' + vchash,
          centreDID,
          vchash,
        }).priority('normal').attempts(10).ttl(1000 * 60 * 2).save()

        return done(null, result.args)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }

  executeQueue = () => {
    this.queue.process(DELIVERY_SERVICE_INIT_TRANSFER, async (job, done) => {
      const vchash = job.data.vchash,
            centreDID = job.data.centreDID

      try {
        const Worker = new DeliveryServiceWorker(this.ethProvider).init(),
              txid = await Worker.execute(centreDID.replace('did:', ''), 1, vchash),
              result = await Worker.getEventListener().watchConfirmationNeededEvent()

        this.queue.create(DELIVERY_SERVICE_CONFIRM_TRANSFER, {
          title: 'Complete multisig process for token transfer to ' + centreDID + ' for claim ' + vchash,
          vchash,
        }).priority('normal').attempts(10).ttl(1000 * 60 * 2).save()

        return done(null, result.args)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }

  confirmQueue = () => {
    this.queue.process(DELIVERY_SERVICE_CONFIRM_TRANSFER, async (job, done) => {
      const vchash = job.data.vchash
      
      try {
        const Worker = new DeliveryServiceWorker(this.ethProvider).init(),
              txid = await Worker.confirm(vchash),
              result = await Worker.getEventListener().watchConfirmationEvent()
        
        return done(null, result.args)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }
}