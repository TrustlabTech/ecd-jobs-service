'use-strict'

import DeliveryServiceWorker from '../workers/DeliveryService'
import {
  DELIVERY_SERVICE_RECORD,
  DELIVERY_SERVICE_INIT_TRANSFER,
} from '../jobs'

export default class DeliveryServiceQueue {
  constructor(queue, ethProvider, storageProvider) {
    this.queue = queue
    this.ethProvider = ethProvider
    this.storageProvider = storageProvider
  }

  init = () => {
    return this
  }

  runAll = () => {
    this.recordQueue()
    this.executeQueue()
  }

  recordQueue = () => {
    this.queue.process(DELIVERY_SERVICE_RECORD, async (job, done) => {
      try {
        const vchash = job.data.vchash,
              centreId = job.data.centreId,
              verifiableClaim = JSON.parse(job.data.verifiableClaim),
              date = 'testdate',
              attendees = verifiableClaim.claim.deliveredService.attendees.length,
              claimedTokens = attendees * 1

        const centre = await this.storageProvider.getCentreModel()
                                                    .findOne({ id: centreId })
                                                    .select('did')
                                                    .exec()

        if (!centre || !centre.did)
          return done(new Error('Could not get centre DID'))        
        
        const Worker = new DeliveryServiceWorker(this.ethProvider).init(),
              txid = await Worker.record(vchash, date, centre.did, attendees, claimedTokens),
              result = await Worker.getEventListener().watchRecordEvent()

        console.log(result)
        
        return done(null, txid)

      } catch (e) {
        return done(new Error(e))
      }
    })
  }

  executeQueue = () => {

  }
}