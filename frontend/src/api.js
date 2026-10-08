import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const createJob = (data) => api.post('/jobs', data)
export const getAllJobs = () => api.get('/jobs')
export const getHistoryCertificates = () => api.get('/history/certificates')
export const getJob = (jobId) => api.get(`/jobs/${jobId}`)
export const getJobCertificates = (jobId) => api.get(`/jobs/${jobId}/certificates`)
export const downloadCertificate = (certId) =>
  api.get(`/certificates/${certId}/download`, { responseType: 'blob' })
export const getCertificateViewUrl = (certId) => `/api/certificates/${certId}/view`

export default api

