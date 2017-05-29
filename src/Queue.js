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

const TTL = 300 // seconds
const MAX_RETRIES = 5
const now = () => {
  return Math.floor(new Date().getTime() / 1000)
}

export default class Queue {

  constructor(ethProvider, storageProvider) {
    this.lastId = -1
    this.queue = []
    this.failed = []
    this.completed = []
    this.active = null
    this.taskStart = {}
    this.monitoring = {}
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
      if (this.failed.length > 0) {
        const retryJob = this.failed.shift()
        if (retryJob.retries && retryJob.retries <= MAX_RETRIES)
          this.queue.push(retryJob) // retry failed tasks
      }
      setTimeout(this.processNext, 1000)
      return
    }

    let job = this.queue.shift()
    if (!job.retries)
      job.retries = 0

    this.active = job

    this.emitter.emit('job processed', job.id, job.data)

    this.startTtlMonitoring(job.id)

    try {
      let result = null

      // delivery service
      if (job.type === DELIVERY_SERVICE_RECORD)
        result = await this.deliveryServiceQueue.recordQueue(job)
      else if (job.type === DELIVERY_SERVICE_RECORD_LIST)
        result = await this.deliveryServiceQueue.recordListQueue(job)
      else if (job.type === DELIVERY_SERVICE_CONFIRM_TRANSFER)
        result = await this.deliveryServiceQueue.confirmQueue(job)
      else if (job.type === DELIVERY_SERVICE_RECORD_STORE_SINGLE)
        result = await this.deliveryServiceQueue.storeSingleVerifiableClaim(job)
      // identity service
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
      
      // odd workaround
      if (this.failed.find(f => { return f.id === job.id }))
        return

      if (result !== null) {
        this.completed.push(job)
        this.emitter.emit('job completed', job.id, result)
      }      
    } catch (e) {
      job.retries++
      this.failed.push(job)
      this.emitter.emit('job failed', job, e.message)
    }

    // tells TTL monitoring that job is completed
    this.stopTtlMonitoring(job.id)

    setTimeout(this.processNext, 1000)
  }

  startTtlMonitoring(jobid) {
    this.taskStart[jobid] = now()

    this.monitoring[jobid] = setInterval(() => {
      if (!this.taskStart[jobid] || this.active.id !== jobid)
        this.clearMonitoringInterval(jobid) // task is completed
      else if (this.active.id === jobid && now() - this.taskStart[jobid] > TTL) {
        this.failed.push(this.active) // retry later
        this.stopTtlMonitoring(jobid)
        this.processNext() // go ahead
      }
    }, 500)
  }

  stopTtlMonitoring(jobid) {
    delete this.taskStart[jobid]
    this.clearMonitoringInterval(jobid)
  }

  clearMonitoringInterval(jobid) {
    if (this.monitoring[jobid]) {
      clearInterval(this.monitoring[jobid])
      delete this.monitoring[jobid]
    }
  }
}