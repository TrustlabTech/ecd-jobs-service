'use-strict'

import EIS from 'identity-service-wrapper'

export const EisWorker = async (ownerAddress, ethProvider) => {
  const gethHost = 'http://' + process.env.ETH_TX_HOST + ':' + process.env.ETH_TX_PORT
  return await EIS(gethHost).spawn(process.env.EIS_ADMIN_ADDRESS, ownerAddress, process.env.EIS_FUNDER_PRIV)
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