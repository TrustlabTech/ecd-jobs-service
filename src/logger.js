'use-strict'

import winston from 'winston'
import { LOG_INFO_PATH, LOG_ERROR_PATH } from './config'

// configure logger
const Logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      name: 'info',
      level: 'info',
      filename: LOG_INFO_PATH,
    }),
    new (winston.transports.File)({
      name: 'error',
      level: 'error',
      filename: LOG_ERROR_PATH,
    }),
  ]
})

export default (emitter) => {
  emitter
    .on('job enqueued', (id, type) => {
      Logger.log('info', 'Job %s of type %s got queued', id, type)
    })
    .on('job processed', (id, data) => {
      Logger.log('info', 'Job %s started, data: %s', id, JSON.stringify(data))
    })
    .on('job completed', (id, result) => {
      Logger.log('info', 'Job %s completed, result: %s', id, typeof result === 'string' ? result : JSON.stringify(result))
    })
    .on('job failed', (job, error) => {
      Logger.log('error', 'Job %s failed, error: %s', job.id, typeof error === 'string' ? error : JSON.stringify(error))
    })
    .on('job removed', (id) => {
      Logger.log('info', 'Job %s removed', id)
    })
    .on('job unknown', (type) => {
      Logger.log('info', 'WARNING: unknown job type %s', typeof type === 'string' ? type : JSON.stringify(type))
    })
}