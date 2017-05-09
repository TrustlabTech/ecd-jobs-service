'use-strict'

import DS from 'delivery-service-wrapper'
import registryAbi from 'delivery-service-wrapper/contracts/Registry.abi'
import registryAddress from 'delivery-service-wrapper/contracts/Registry.address'
import deliveryServiceAbi from 'delivery-service-wrapper/contracts/DeliveryService.abi'
import deliveryServiceAddress from 'delivery-service-wrapper/contracts/DeliveryService.address'

class DeliveryServiceEventWathcer {
  constructor(registryInstance) {
    this.registryInstance = registryInstance
  }

  watchRecordEvent = () => {
    return new Promise((resolve, reject) => {
      this.registryInstance.Record((error, result) => {
        if (error)
          reject(error)
        else
          resolve(result)
      })
    })
  }
}

export default class DeliveryServiceWorker {
  constructor(ethProvider) {
    this.ethProvider = ethProvider
  }

  init = () => {
    const registryInterface = this.ethProvider.eth.contract(registryAbi),
          deliveryServiceInterface = this.ethProvider.eth.contract(deliveryServiceAbi)

    this.registryInstance = registryInterface.at([registryAddress])
    this.deliveryServiceInstance = deliveryServiceInterface.at([deliveryServiceAddress])

    this.wrapper = DS(this.ethProvider, false)
    this.actingAs = process.env.DS_SYSTEM_PRIV

    this.eventListener = new DeliveryServiceEventWathcer(this.registryInstance)

    return this
  }

  record = (vchash, date, centreDID, attendees, claimedTokens) => {
    return new Promise((resolve, reject) => {
      this.wrapper.record(vchash, date, centreDID, attendees, claimedTokens, this.actingAs, (err, txid) => {
        if (err) reject(err)
        else resolve(txid)
      })
    })
  }

  execute = (to, value, vchash) => {
    return new Promise((resolve, reject) => {
      this.wrapper.execute(to, value, vchash, this.actingAs, (err, txid) => {
        if (err) reject(err)
        else resolve(txid)
      })
    })
  }

  confirm = (vchash) => {
    return new Promise((resolve, reject) =>  {
      this.wrapper.confirm(vchash, process.env.DS_ASSURANCE_PRIV, (err, txid) => {
        if (err) reject(err)
        else resolve(txid)
      })
    })
  }

  getEventListener = () => {
    return this.eventListener
  }

  setEthereumProvider = (ethProvider) => {
    this.ethProvider = ethProvider
  }
}