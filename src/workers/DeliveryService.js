'use-strict'

import DS from 'delivery-service-wrapper'
import registryAbi from 'delivery-service-wrapper/contracts/Registry.abi'
import registryAddress from 'delivery-service-wrapper/contracts/Registry.address'
import deliveryServiceAbi from 'delivery-service-wrapper/contracts/DeliveryService.abi'
import deliveryServiceAddress from 'delivery-service-wrapper/contracts/DeliveryService.address'

class DeliveryServiceEventWathcer {
  constructor(registryInstance, deliveryServiceInstance) {
    this.registryInstance = registryInstance
    this.deliveryServiceInstance = deliveryServiceInstance
  }  

  watchRecordEvent = () => {
    return new Promise((resolve, reject) => {
      this.registryInstance.Record((err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }

  watchConfirmationNeededEvent = () => {
    return new Promise((resolve, reject) => {
      this.deliveryServiceInstance.ConfirmationNeeded((err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }

  watchConfirmationEvent = () => {
    return new Promise((resolve, reject) => {
      this.deliveryServiceInstance.Confirmation((err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }

  recordEvent = () => {
    return this.registryInstance.Record()
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
    this.simulateAssuranceBot = process.env.DS_ASSURANCE_PRIV

    this.eventListener = new DeliveryServiceEventWathcer(this.registryInstance, this.deliveryServiceInstance)

    return this
  }

  record = (vchash, date, centreDID, unitCode) => {
    return new Promise((resolve, reject) => {
      this.wrapper.record(vchash, date, centreDID, unitCode, this.actingAs, (err, txid) => {
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
      this.wrapper.confirm(vchash, this.simulateAssuranceBot, (err, txid) => {
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