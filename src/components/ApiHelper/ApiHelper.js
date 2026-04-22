import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ibdash.dotters.network:9000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ibp_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ibp_auth_token');
    }
    return Promise.reject(error);
  }
);

const withParams = (params = {}, options = {}) => ({
  ...options,
  params: {
    ...params,
    ...(options.params || {})
  }
});

const ApiHelper = {
  // Request endpoints
  fetchRequestsByCountry: (params, options = {}) => api.get('/requests/country', withParams(params, options)),
  fetchRequestsByASN: (params, options = {}) => api.get('/requests/asn', withParams(params, options)),
  fetchRequestsByService: (params, options = {}) => api.get('/requests/service', withParams(params, options)),
  fetchRequestsByMember: (params, options = {}) => api.get('/requests/member', withParams(params, options)),
  fetchRequestsSummary: (params, options = {}) => api.get('/requests/summary', withParams(params, options)),
  
  // Downtime endpoints
  fetchDowntimeEvents: (params, options = {}) => api.get('/downtime/events', withParams(params, options)),
  fetchCurrentDowntime: (options = {}) => api.get('/downtime/current', options),
  fetchDowntimeSummary: (params, options = {}) => api.get('/downtime/summary', withParams(params, options)),
  
  // Member endpoints
  fetchMembers: (options = {}) => api.get('/members', options),
  fetchMemberStats: (memberName, params, options = {}) => 
    api.get('/members/stats', withParams({ name: memberName, ...params }, options)),
  
  // Service endpoints
  fetchServices: (options = {}) => api.get('/services', options),
  fetchServicesHierarchy: (options = {}) => api.get('/services?hierarchy=true', options),
  fetchServicesSummary: (options = {}) => api.get('/services/summary', options),
  
  // Billing endpoints
  fetchBillingBreakdown: (params, options = {}) => api.get('/billing/breakdown', withParams(params, options)),
  fetchBillingSummary: (options = {}) => api.get('/billing/summary', options),

  // Billing PDF endpoints
  fetchBillingPDFs: (params, options = {}) => api.get('/billing/pdfs', withParams(params, options)),
  downloadBillingPDF: (params, options = {}) => api.get('/billing/pdfs/download', {
    ...withParams(params, options),
    responseType: 'arraybuffer'
  }),
};

export default ApiHelper;