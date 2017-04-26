'use-strict'

const LOGS_DIR = './logs/'
const LOG_INFO_FILE = process.env.NODE_ENV === 'production' ? 'jobs.info.log' : 'jobs.info.debug.log'
const LOG_ERROR_FILE = process.env.NODE_ENV === 'production' ? 'jobs.error.log' : 'jobs.error.debug.log'

export const LOG_INFO_PATH = LOGS_DIR + LOG_INFO_FILE
export const LOG_ERROR_PATH = LOGS_DIR + LOG_ERROR_FILE