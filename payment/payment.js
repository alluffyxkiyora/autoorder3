const CashiAPI = require("./cashi");

class Payment {
  constructor() {
    this.cashi = new CashiAPI();
  }

  generateInvoice() {
    return `Mng-TRX${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  async createQris(amount) {
    try {
      if (amount < 2000 || amount > 10000000) {
        throw new Error("Amount tidak valid");
      }

      const invoice = this.generateInvoice();
      const res = await this.cashi.createOrder(
        Number(amount),
        invoice
      );

      console.log("✅ SUCCESS CREATE QRIS:", res);

      return {
        success: true,
        invoice: invoice,
        amount: res.amount,
        checkout: res.checkout_url,
        qr: res.qrUrl || res.qris_url || res.qr_image,
        expired: res.expires_at
      };

    } catch (err) {
      console.log("❌ FAILED CREATE QRIS:", err.response?.data || err.message);
      return {
        success: false,
        message: err.response?.data || err.message
      };
    }
  }

  async statusQris(orderId) {
    try {
      const res = await this.cashi.checkStatus(orderId);
      console.log("📊 CHECK STATUS:", res);
      return {
        success: true,
        invoice: res.order_id,
        amount: res.amount,
        status: res.status,
      }
    } catch (err) {
      console.log("❌ FAILED CHECK STATUS:", err.response?.data || err.message);
      return {
        success: false,
        message: err.response?.data || err.message
      };
    }
  }
}

module.exports = Payment;