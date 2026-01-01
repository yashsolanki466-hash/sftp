import { useCallback } from 'react'

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  retryable: boolean
}

export const useSessionError = () => {
  const parseError = useCallback((error: any): ApiError => {
    const statusCode = error?.response?.status
    const message = error?.response?.data?.error || error?.message || 'An unexpected error occurred'
    
    // Determine if error is retryable
    const retryable = !statusCode || statusCode >= 500 || statusCode === 408 || statusCode === 429

    return {
      message,
      code: error?.code,
      statusCode,
      retryable
    }
  }, [])

  const getErrorDisplay = useCallback((error: ApiError): string => {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'Authentication failed. Please check your credentials.'
    }
    if (error.statusCode === 404) {
      return 'Server or path not found.'
    }
    if (error.statusCode === 500) {
      return 'Server error. Please try again later.'
    }
    if (error.statusCode === 503) {
      return 'Service unavailable. Please try again later.'
    }
    if (error.statusCode === 408 || error.statusCode === 429) {
      return 'Request timeout. Please try again.'
    }
    return error.message
  }, [])

  return {
    parseError,
    getErrorDisplay
  }
}
