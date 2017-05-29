'use-strict'

import request from 'request'
import mongoose from 'mongoose'

const API_V1_BASE = 'http://staging.ecd.cnsnt.io/api/v1'

export default class IdentityServiceStorageQueue {
  constructor(queue, storageProvider) {
    this.queue = queue
    this.storageProvider = storageProvider
  }

  storeCentre = async (job) => {
    const id = job.data.id,
          did = job.data.did,
          ddo = job.data.ddo,
          eth = job.data.eth,
          query = { id },
          update = { id, did, ddo, eth },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getCentreModel().findOneAndUpdate(query, update, options)
    const v1Record = await this.submitToV1(id, did, 'centre')
    
    return { did: record.did, ddo: record.ddo }
  }

  storeChildren = async (job) => {
    const id = job.data.id,
          did = job.data.did,
          ddo = job.data.ddo || ''

    const query = { id },
          update = { id, did, ddo },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getChildModel().findOneAndUpdate(query, update, options)
    const v1Record = await this.submitToV1(id, did, 'child')
    
    return { did: record.did, ddo: record.ddo }
  }

  storePractitioner = async (job) => {
    const id = job.data.id,
          did = job.data.did,
          ddo = job.data.ddo,
          eth = job.data.eth,
          query = { id },
          update = { id, did, ddo, eth },
          options = { upsert: true, new: true, setDefaultsOnInsert: false }
    
    const record = await this.storageProvider.getPractitionerModel().findOneAndUpdate(query, update, options)
    const v1Record = await this.submitToV1(id, did, 'staff')

    return { did: record.did, ddo: record.ddo }
  }

  submitToV1 = async (id, did, resource) => {
    request(`${API_V1_BASE}/staff/login`, {
      method: 'POST',
      uri: `${API_V1_BASE}/staff/login`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        username: process.env.V1_AUTH_USER,
        password: process.env.V1_AUTH_PASSWORD,
      },
      json: true,
      gzip: true,
      simple: false,
      resolveWithFullResponse: true,
    }, (loginError, loginResponse, loginBody) => {
      if (!loginError && loginResponse.statusCode === 200) {
        request({
          method: 'PATCH',
          uri: `${API_V1_BASE}/${resource}/${id}`,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginBody._token}`,
          },
          body: {
            did,
          },
          json: true,
          simple: false,
          gzip: true,
          resolveWithFullResponse: true,
        }, (error, response, body) => {
          // no-oping here
        })
      }

    })
  }
}