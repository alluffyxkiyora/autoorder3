const axios = require("axios");

const { cashiApikey } = require("../config");

class CashiAPI {
  constructor() {
    this.apiKey = cashiApikey;
    this.baseURL = "https://cashi.id/api";
  }

  async createOrder(amount, orderId) {
    const response = await axios.post(
      `${this.baseURL}/create-order`,
      {
        amount,
        order_id: orderId
      },
      {
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  }

  async checkStatus(orderId) {
    const response = await axios.get(
      `${this.baseURL}/check-status/${orderId}`,
      {
        headers: {
          "x-api-key": this.apiKey
        }
      }
    );

    return response.data;
  }
}

module.exports = CashiAPI;