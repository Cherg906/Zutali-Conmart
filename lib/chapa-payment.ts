/**
 * Chapa Payment Integration for Zutali Conmart
 * Ethiopian payment gateway integration
 */

import crypto from 'crypto'

export interface ChapaPaymentData {
  amount: number
  currency: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  tx_ref: string
  callback_url: string
  return_url: string
  description?: string
  title?: string
}

export interface ChapaResponse {
  message: string
  status: string
  data: {
    checkout_url: string
  }
}

export class ChapaPayment {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, isTest: boolean = true) {
    this.apiKey = apiKey
    this.baseUrl = isTest 
      ? 'https://api.chapa.co/v1' 
      : 'https://api.chapa.co/v1'
  }

  /**
   * Initialize payment with Chapa
   */
  async initializePayment(paymentData: ChapaPaymentData): Promise<ChapaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: paymentData.currency,
          email: paymentData.email,
          first_name: paymentData.first_name,
          last_name: paymentData.last_name,
          phone_number: paymentData.phone_number,
          tx_ref: paymentData.tx_ref,
          callback_url: paymentData.callback_url,
          return_url: paymentData.return_url,
          customization: {
            title: paymentData.title || 'Zutali Conmart Payment',
            description: paymentData.description || 'Payment for Zutali Conmart services',
            logo: 'https://zutali.com/logo.png'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Chapa payment initialization error:', error)
      throw error
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(txRef: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Chapa payment verification error:', error)
      throw error
    }
  }

  /**
   * Generate unique transaction reference
   */
  static generateTxRef(prefix: string = 'zutali'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
   /**
   * Verify webhook signature
   */
   verifyWebhookSignature(signature: string, payload: any, secret: string): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret)
      const digest = hmac.update(JSON.stringify(payload)).digest('hex')
      return signature === digest
    } catch (error) {
      console.error('Error verifying webhook signature:', error)
      return false
    }
  }
}

/**
 * React hook for Chapa payment integration
 */
export function useChapaPayment(apiKey: string, isTest: boolean = true) {
  const chapa = new ChapaPayment(apiKey, isTest)

  const initializePayment = async (paymentData: Omit<ChapaPaymentData, 'tx_ref'>) => {
    const tx_ref = ChapaPayment.generateTxRef()
    
    const fullPaymentData: ChapaPaymentData = {
      ...paymentData,
      tx_ref,
      callback_url: paymentData.callback_url || `${window.location.origin}/api/payment/callback`,
      return_url: paymentData.return_url || `${window.location.origin}/payment/success`
    }

    try {
      const response = await chapa.initializePayment(fullPaymentData)
      
      if (response.status === 'success') {
        // Redirect to Chapa checkout
        window.location.href = response.data.checkout_url
        return { success: true, tx_ref, checkout_url: response.data.checkout_url }
      } else {
        throw new Error(response.message || 'Payment initialization failed')
      }
    } catch (error) {
      console.error('Payment initialization failed:', error)
      return { success: false, error: error.message }
    }
  }

  const verifyPayment = async (txRef: string) => {
    try {
      const response = await chapa.verifyPayment(txRef)
      return response
    } catch (error) {
      console.error('Payment verification failed:', error)
      return { success: false, error: error.message }
    }
  }

  return {
    initializePayment,
    verifyPayment
  }
}
