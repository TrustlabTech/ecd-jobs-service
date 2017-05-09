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

export default (queue) => {
  queue
    .on('job enqueue', (id, type) => {
      Logger.log('info', 'Job %s of type %s got queued', id, type)
    })
    .on('job complete', (id, result) => {
      Logger.log('info', 'Job %s completed, result: %s', id, typeof result === 'string' ? result : JSON.stringify(result))
    })
    .on('job failed', (id, error) => {
      Logger.log('error', 'Job %s failed, error: %s', id, typeof error === 'string' ? error : JSON.stringify(error))
    })
    .on('job failed attempt', (id, error, attempts) => { // eslint-disable-line no-unused-vars
      Logger.log('error', 'Job %s failed (attempts: %d), error: %s', id, attempts, typeof error === 'string' ? error : JSON.stringify(error))
    })
    .on('job remove', (id) => {
      Logger.log('info', 'Job %s removed', id)
    })
}