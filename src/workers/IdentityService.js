'use-strict'

import EIS from 'identity-service-wrapper'

export const EisWorker = (ownerAddress, ethProvider) => {
  return new Promise((resolve, reject) => {
    EIS(ethProvider, false).spawn(
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
  })
}

export const EisEventWatcher = (RegistryInstance) => {
  return new Promise((resolve, reject) => {
    RegistryInstance.CreatedDID((error, result) => {
      if (error)
        reject(error)
      else
        resolve(result)
    })
  })
}