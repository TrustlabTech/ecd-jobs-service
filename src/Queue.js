'use-strict'

import { EventEmitter } from 'events'
import DeliveryServiceQueue from './queues/DeliveryService'
import IdentityServiceQueue from './queues/IdentityService'
import IdentityServiceStorageQueue from './queues/IdentityServiceStorage'
import {
  DELIVERY_SERVICE_RECORD,
  DELIVERY_SERVICE_RECORD_LIST,
  DELIVERY_SERVICE_INIT_TRANSFER,
  DELIVERY_SERVICE_CONFIRM_TRANSFER,
  DELIVERY_SERVICE_RECORD_STORE_SINGLE,

  IDENTITY_SERVICE_CENTRES,
  IDENTITY_SERVICE_CHILDREN,
  IDENTITY_SERVICE_PRACTITIONERS,
  IDENTITY_SERVICE_CENTRES_STORAGE,
  IDENTITY_SERVICE_CHILDREN_STORAGE,
  IDENTITY_SERVICE_PRACTITIONERS_STORAGE,
} from './jobs'

export default class Queue {
  constructor(ethProvider, storageProvider) {
    this.lastId = -1
    this.queue = []
    this.failed = []
    this.completed = []
    this.active = null
    this.emitter = new EventEmitter()

    this.deliveryServiceQueue = new DeliveryServiceQueue(this, ethProvider, storageProvider)
    this.identityServiceQueue = new IdentityServiceQueue(this, ethProvider, storageProvider)
    this.identityServiceStorageQueue = new IdentityServiceStorageQueue(this, storageProvider)
  }

  getEmitter = () => {
    return this.emitter
  }

  create = (type, data) => {
    const id = ++this.lastId
    this.queue.push({ id, type, data })
    this.emitter.emit('job enqueued', id, type)
  }

  processNext = async () => {
    if (this.queue.length === 0) {
      setTimeout(this.processNext, 1000)
      return
    }
    
    const job = this.queue.shift()

    this.emitter.emit('job processed', job.id, job.data)
    this.active = job
    
    try {
      let result = null

      if (job.type === DELIVERY_SERVICE_RECORD)
        result = await this.deliveryServiceQueue.recordQueue(job)
      else if (job.type === DELIVERY_SERVICE_RECORD_LIST)
        result = await this.deliveryServiceQueue.recordListQueue(job)
      else if (job.type === DELIVERY_SERVICE_CONFIRM_TRANSFER)
        result = await this.deliveryServiceQueue.confirmQueue(job)
      else if (job.type === DELIVERY_SERVICE_RECORD_STORE_SINGLE)
        result = await this.deliveryServiceQueue.storeSingleVerifiableClaim(job)

      else if (job.type === IDENTITY_SERVICE_CHILDREN)
        result = await this.identityServiceQueue.childrenQueue(job)
      else if (job.type === IDENTITY_SERVICE_CENTRES)
        result = await this.identityServiceQueue.centresQueue(job)
      else if (job.type === IDENTITY_SERVICE_PRACTITIONERS)
        result = await this.identityServiceQueue.practitionersQueue(job)
      else if (job.type === IDENTITY_SERVICE_CENTRES_STORAGE)
        result = await this.identityServiceStorageQueue.storeCentre(job)
      else if (job.type === IDENTITY_SERVICE_CHILDREN_STORAGE)
        result = await this.identityServiceStorageQueue.storeChildren(job)
      else if (job.type === IDENTITY_SERVICE_PRACTITIONERS_STORAGE)
        result = await this.identityServiceStorageQueue.storePractitioner(job)
      else
        this.emitter.emit('job unknown', job.type)
      
      if (result !== null) {
        this.completed.push(job)
        this.emitter.emit('job completed', job.id, result)
      }
    } catch (e) {
      this.failed.push(job)
      this.emitter.emit('job failed', job, e.message)
    }

    setTimeout(this.processNext, 1000)
  }
}