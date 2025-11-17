import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export async function processPayment({ cart, discount, paymentMethod, setCart, setDiscount, setDiscountValue, setPaymentMethod, setMessage }) {
  if (!cart || cart.length === 0) return;

  try {
    const monthKey = new Date().toISOString().slice(0, 7);

    // Update stock
    for (const item of cart) {
      const productRef = doc(db, "products", item.id);
      const productSnap = await getDoc(productRef);
      const currentData = productSnap.data();

      const currentMonthlySales = currentData.monthlySales || {};
      const currentMonthSales = currentMonthlySales[monthKey] || 0;

      await updateDoc(productRef, {
        qty: currentData.qty - item.quantity,
        [`monthlySales.${monthKey}`]: currentMonthSales + item.quantity,
      });
    }

    // Map items with discounted subtotal
    const saleItems = cart.map(item => {
      const originalSubtotal = (item.price || 0) * item.quantity;
      let discountedSubtotal = originalSubtotal;

      if (discount) {
        if (discount.type === "percent") {
          discountedSubtotal = originalSubtotal * (1 - parseFloat(discount.value) / 100);
        } else {
          const totalBeforeDiscount = cart.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
          const ratio = originalSubtotal / totalBeforeDiscount;
          discountedSubtotal = originalSubtotal - ratio * parseFloat(discount.value);
        }
      }

      return {
        productId: item.id,
        name: item.name,
        qty: item.quantity,
        price: item.price || 0,
        subtotal: discountedSubtotal,
      };
    });

    const totalAfterDiscount = saleItems.reduce((s, it) => s + it.subtotal, 0);

    await addDoc(collection(db, "sales_history"), {
      items: saleItems,
      total: totalAfterDiscount,
      month: monthKey,
      status: "completed",
      discount: discount || null,
      paymentMethod: paymentMethod || null,
      createdAt: serverTimestamp(),
    });

    setCart([]);
    setDiscount(null);
    setDiscountValue("");
    setPaymentMethod(null);
    setMessage("✅ Purchase completed!");
    setTimeout(() => setMessage(null), 3000);

  } catch (err) {
    console.error(err);
    setMessage("❌ Error completing purchase.");
    setTimeout(() => setMessage(null), 3000);
  }
}
