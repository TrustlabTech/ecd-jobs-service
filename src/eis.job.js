'use-strict'

import EIS from 'identity-service-wrapper'

export const EisWorker = (ownerAddress) => {
  return new Promise((resolve, reject) => {
    try {
      const eis = EIS('http://' + process.env.ETH_TX_HOST + ':' + process.env.ETH_TX_PORT)

      eis.spawn(
        process.env.EIS_ADMIN_ADDRESS,
        ownerAddress,
        process.env.EIS_FUNDER_PRIV,
        (err, txid) => {
          if (err)
            reject(err)
          else
            resolve(txid)
        }
      )
    } catch (e) {
      reject(e)
    }
  })
}

export const EisEventWatcher = (RegistryInstance) => {
  return new Promise((resolve, reject) => {
    RegistryInstance.CreatedDID((error, result) => {
      console.log('Event result')
      console.log(result)
      if (error)
        reject(error)
      else
        resolve(result)
    })
  })
}