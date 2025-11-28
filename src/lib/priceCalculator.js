// src/lib/priceCalculator.js

// A lightweight, synchronous implementation of the backend's pricing logic.
// All functions are pure, taking in data and returning results.
/**
 * Safely converts a value to a float, defaulting to 0 if it's NaN or null/undefined.
 * @param {any} value
 * @returns {number}
 */
const safeParseFloat = (value) => {
  // Use parseFloat, and ensure the result is a finite number, otherwise return 0
  const parsed = parseFloat(value)
  return isFinite(parsed) ? parsed : 0
}

/**
 * Executes a calculation on the client side for instant UI feedback.
 *
 * @param {object} intentData The current selections (tickets, add_ons, couponCode).
 * @param {object} service The service object containing ticketTiers, addons, and pricingRules.
 * @returns {object} The full PriceBreakdown object (Client-side estimate).
 */
export function calculateClientPrice(intentData, service) {
  const breakdown = {
    base_subtotal: 0,
    adjusted_subtotal: 0,
    add_ons_total: 0,
    final_total: 0,
    line_items: [],
    discounts: [],
  }

  // --- Step 1: Process Tickets and Base Price Adjustment ---
  // NOTE: For simplicity in the client, we are not fully implementing the complex
  // "Base Price Adjustment" rule application here, as that is rare and better left
  // to the server's final audit for authoritative pricing.
  // We rely on the initial API call (daily-manifest) to give us the final TIER price.

  const availableTiers = service.ticket_tiers || service.ticketTiers || []
  let ticketSubtotal = 0

  for (const selection of intentData.tickets) {
    const tier =
      availableTiers.find((t) => t.id === selection.tier_id) ||
      availableTiers.find((t) => t.id === selection.tier_id.value) // Handle tier object vs. id
    // CRITICAL: Ensure Quantity is a valid number, default to 0
    const quantity = safeParseFloat(selection.quantity)

    if (!tier || selection.quantity <= 0) continue

    // Use the Tier's price, assuming it has already been adjusted by the backend (DailyManifest)
    const unitPrice = safeParseFloat(tier.price || tier.base_price)
    const subtotal = unitPrice * quantity

    breakdown.line_items.push({
      ticket_tier_id: selection.tier_id,
      name: tier.name,
      quantity: selection.quantity,
      unit_price: unitPrice,
      subtotal: subtotal,
    })
    ticketSubtotal += subtotal
  }

  breakdown.base_subtotal = ticketSubtotal
  breakdown.adjusted_subtotal = ticketSubtotal // Client calculation assumes this is the price to discount

  // --- Step 2: Apply Coupon Discount (The most common client-side calculation) ---
  let totalDiscount = 0
  const couponCode = intentData.couponCodeInput
  const coupon = service.coupons?.find((c) => c.code === couponCode) || null

  if (coupon) {
    // Simple client-side discount calculation for instant feedback
    const discountValue = safeParseFloat(coupon.discount_value)
    const maxDiscountAmount = safeParseFloat(coupon.effects?.max_discount_amount)
    if (coupon.discount_type === 'percentage') {
      let potentialDiscount = ticketSubtotal * (discountValue / 100)

      // Apply Max Discount Cap if it exists
      if (maxDiscountAmount > 0 && potentialDiscount > maxDiscountAmount) {
        totalDiscount = maxDiscountAmount
      } else {
        totalDiscount = potentialDiscount
      }
    } else if (coupon.discount_type === 'fixed') {
      totalDiscount = discountValue
    }
    // NOTE: BOGO is complex and risky, so we rely on the backend audit for the actual BOGO value.
    totalDiscount = Math.min(totalDiscount, ticketSubtotal)

    if (totalDiscount > 0) {
      breakdown.discounts.push({
        name: `Coupon: ${couponCode}`,
        amount: totalDiscount,
      })
    }
  }

  // --- Step 3: Process Add-ons ---
  let addOnsTotal = 0
  const availableAddOns = service.addons || []

  for (const selection of intentData.addOns) {
    const addOn = availableAddOns.find((a) => a.id === selection.add_on_id)

    const addOnPrice = safeParseFloat(addOn?.base_price)
    const addOnQuantity = safeParseFloat(selection.quantity)

    if (addOn && !addOn.is_included_in_ticket) {
      addOnsTotal += addOnPrice * addOnQuantity
    }
  }

  breakdown.add_ons_total = addOnsTotal

  // --- Step 4: Final Calculations ---
  const totalDiscountAmount = breakdown.discounts.reduce(
    (sum, d) => sum + safeParseFloat(d.amount),
    0,
  )

  breakdown.final_total = Math.max(0, ticketSubtotal - totalDiscountAmount + addOnsTotal)
  breakdown.base_subtotal = parseFloat(breakdown.base_subtotal.toFixed(2))
  breakdown.adjusted_subtotal = parseFloat(breakdown.adjusted_subtotal.toFixed(2))
  breakdown.add_ons_total = parseFloat(breakdown.add_ons_total.toFixed(2))
  breakdown.final_total = parseFloat(breakdown.final_total.toFixed(2))

  return breakdown
}
