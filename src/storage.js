'use-strict'

import mongoose from 'mongoose'

const childSchema = {
  id: Number,
  did: String,
  ddo: String,
  eth: {
    pubkey: String,
    privkey: String,
    address: String,
  },
  verifiableClaims: Array,
}

const childSchemaOptions = {
  collection: 'children'
}

const centreSchema = {
  id: Number,
  did: String,
  ddo: String,
  eth: {
    pubkey: String,
    privkey: String,
    address: String,
  },
  verifiableClaims: Array,
}

export default class Storage {
  constructor() {
    const 
      port = process.env.DB_PORT || 27017,
      database = process.env.DB_NAME || 'db',
      schema = process.env.DB_SCHEMA || 'mongodb://',
      host = process.env.DB_HOST || 'localhost',
      username = process.env.DB_USERNAME || '',
      password = process.env.DB_PASSWORD || ''
    
    this.connection = schema + username + ':' + password + '@' + host + ':' + port + '/' + database
  }

  init() {
    // set native Promise
    mongoose.Promise = global.Promise
    const db = mongoose.connection
    this.provider = mongoose.connect(this.connection, { poolSize: 10 })
    
    db.on('error', () => {
      throw new Error('[FATAL] Could not connect to database')
    })

    db.once('open', () => {
      console.log('[INFO] Database connection opened successfully') // eslint-disable-line no-console

      this.childModel = this.provider.model('Child', new mongoose.Schema(childSchema, childSchemaOptions), 'children')
      this.centreModel = this.provider.model('Centre', new mongoose.Schema(centreSchema))
    })

    return this
  }

  getProvider() {
    return this.provider
  }

  getChildModel() {
    return this.childModel
  }

  getCentreModel() {
    return this.centreModel
  }
}