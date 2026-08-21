import { app_api_get, app_api_put } from './apis';
import { set_shift, set_sub_shift } from './shifts_functions_apis';
import { app_post, app_delete, app_get, app_put } from './app';
import { set_localstorage, get_localstorage } from './localstorage';

// ─── Square / Zoho order helpers ─────────────────────────────────────────────

export async function get_total_price({ shiftDetails, promoCode, selectedSquareItems }) {
    const response = await app_api_get('square/', {
        request_type: 'post',
        url: '/orders',
        payload: {
            order: {
                location_id: shiftDetails.square_location_id,
                line_items: selectedSquareItems,
                state: 'OPEN',
                customer_id: shiftDetails.customer_id,
                discounts: (promoCode && promoCode.square_pre > 0)
                    ? [{ name: promoCode.name, percentage: String(promoCode.percentage) }]
                    : [],
            },
        },
    });
    if (response.order)   return response.order;
    if (response.errors)  return { error: `${response.errors[0].detail}, ${response.errors[0].field}` };
    return { error: `${response.error}` };
}

export async function create_payment_api({ shiftDetails, orderDetails, paymentMethod }) {
    const data = {
        order_id: orderDetails.id,
        note: `Booking owner: ${shiftDetails.user.username}`,
        source_id: paymentMethod === 'cash' ? 'CASH' : 'EXTERNAL',
        amount: orderDetails.total_money.amount,
        amount_money: { amount: orderDetails.total_money.amount, currency: 'EGP' },
        team_member_id: shiftDetails.square_team_member_id,
        customer_id: shiftDetails.customer_id,
        location_id: shiftDetails.square_location_id,
    };
    if (paymentMethod === 'cash') {
        data.cash_details = { buyer_supplied_money: { amount: orderDetails.total_money.amount, currency: 'EGP' } };
    } else {
        data.autocomplete = true;
    }
    return app_api_get('square/', { request_type: 'post', url: '/payments', payload: data });
}

export async function create_sales_receipt({ shiftDetails, orderDetails, paymentData, selectedZohoItems }) {
    const today = new Date(orderDetails.created_at);
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const dateTimeStr = `${dateStr} ${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}:${String(today.getSeconds()).padStart(2,'0')}`;
    return app_api_get('zoho/', {
        request_type: 'post',
        url: '/salesreceipts',
        payload: {
            is_generic_customer: true,
            customer_name: 'Walk-in Customer',
            date: dateStr,
            line_items: selectedZohoItems,
            payment_mode: paymentData.source_type === 'CASH' ? 'cash' : 'creditcard',
            custom_fields: [
                { label: 'Product',               value: 'Park' },
                { label: 'Gravity Branch',         value: shiftDetails.user.group_name },
                { label: 'Staff Name',             value: shiftDetails.user.username },
                { label: 'Date and Time',          value: dateTimeStr },
                { label: 'Square receipt number',  value: paymentData.receipt_number },
            ],
        },
    });
}

// ─── Inventory helpers ────────────────────────────────────────────────────────

export async function add_to_inventory({ shiftDetails, subShiftDetails, paymentData, options, note }) {
    console.log('Adding to inventory with options:', shiftDetails, subShiftDetails, paymentData, options, note);
    options.forEach(item => {
        if (shiftDetails.inventory[item.name]) {
            shiftDetails.inventory[item.name].sold += parseInt(item.quantity);
        }
    });

    const amount = paymentData.total_money.amount / 100;
    if (paymentData.source_type === 'CASH') {
        shiftDetails.shift_money_cash    = Number(shiftDetails.shift_money_cash) + amount;
        subShiftDetails.shift_money_cash = Number(subShiftDetails.shift_money_cash) + amount;
    } else {
        shiftDetails.shift_money_visa    = Number(shiftDetails.shift_money_visa) + amount;
        subShiftDetails.shift_money_visa = Number(subShiftDetails.shift_money_visa) + amount;
    }

    if (note) {
        const newNote = { [paymentData.receipt_number]: note };
        shiftDetails.note    = { ...shiftDetails.note,    ...newNote };
        subShiftDetails.note = { ...subShiftDetails.note, ...newNote };
    }

    await set_shift(shiftDetails);
    await set_sub_shift(subShiftDetails);
    return true;
}

export async function delete_from_inventory({ bookingDetails, shiftDetails, subShiftDetails }) {
    bookingDetails.options.forEach(item => {
        if (shiftDetails.inventory[item.name]) {
            shiftDetails.inventory[item.name].refund += parseInt(item.quantity);
        }
    });

    const amount = bookingDetails.payment.amount;
    if (bookingDetails.payment.method === 'cash') {
        shiftDetails.refund_cash    += amount;
        subShiftDetails.refund_cash += amount;
    } else {
        shiftDetails.refund_visa    += amount;
        subShiftDetails.refund_visa += amount;
    }

    await set_shift(shiftDetails);
    await set_sub_shift(subShiftDetails);
}

// ─── Booking CRUD ─────────────────────────────────────────────────────────────

export async function create_booking({ sessionsDetails, bookingDetails, round }) {
    if (round > 0) {
        // Drop the id WITHOUT mutating bookingDetails — it is React state and
        // the same object is reused across retries / promo rounds. Mutating it
        // with `delete` corrupted later rounds and any retry attempt.
        const { id, ...rest } = bookingDetails;
        return app_post('booking/', rest);
    }
    if (bookingDetails.id) {
        return app_put(`booking/${bookingDetails.id}/`, {}, bookingDetails);
    }
    return app_post('booking/', bookingDetails);
}

// A booking write is only a real success when the server returns a row with a
// real id. A missing id, an `.error` field, or a thrown network error all mean
// the row was NOT persisted.
function is_real_booking(res) {
    return !!(res && !res.error && res.id);
}

// Retry a single booking write a few times on transient failures (throttle,
// network blip, 5xx). The Square payment already went through by this point, so
// we try hard to get the row written rather than losing it.
export async function create_booking_with_retry({ sessionsDetails, bookingDetails, round, retries = 2 }) {
    let last = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await create_booking({ sessionsDetails, bookingDetails, round });
            if (is_real_booking(res)) {
                return res;
            }
            last = res || { error: 'Empty response from the server.' };
        } catch (err) {
            last = { error: err?.message || 'Network error while saving the booking.' };
        }
        if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 400));
        }
    }
    return last;
}

// ─── Failed-booking recovery ─────────────────────────────────────────────────
// When Square charged the customer but the booking row could not be written,
// we do NOT roll back the payment. Instead the booking payload is stored locally
// so it can be re-saved automatically the next time the Booking page loads.

const FAILED_BOOKINGS_KEY = 'failedBookings';

export function get_failed_bookings() {
    try {
        return JSON.parse(get_localstorage(FAILED_BOOKINGS_KEY)) || [];
    } catch {
        return [];
    }
}

export function save_failed_booking(record) {
    const list = get_failed_bookings();
    list.push({ ...record, saved_at: new Date().toISOString() });
    set_localstorage(FAILED_BOOKINGS_KEY, JSON.stringify(list));
}

export async function resave_failed_bookings() {
    const list = get_failed_bookings();
    if (!list.length) return 0;

    const remaining = [];
    let recovered = 0;
    for (const record of list) {
        const res = await create_booking_with_retry({
            bookingDetails: record.bookingDetails,
            round: record.round ?? 0,
            retries: 1,
        });
        if (is_real_booking(res)) {
            recovered += 1;
        } else {
            remaining.push(record);
        }
    }
    set_localstorage(FAILED_BOOKINGS_KEY, JSON.stringify(remaining));
    return recovered;
}

export async function create_hold_booking({ bookingDetails, session_id, numberOfPlayers }) {
    const data = {
        number_of_players: numberOfPlayers,
        created_at: new Date(),
        status: 'hold',
        session: session_id,
    };
    if (bookingDetails?.id) {
        data.id = bookingDetails.id;
        return app_put(`booking/${bookingDetails.id}/`, {}, data);
    }
    return app_post('booking/', data);
}

export async function delete_hold_booking({ bookingId }) {
    console.log('Deleting hold booking with ID:', bookingId);
    if (bookingId && bookingId !== 'undefined') {
        await app_delete(`booking/${bookingId}/`);
        set_localstorage('bookingId', undefined);
    }
}

export async function get_booking_details(booking_id) {
    return app_get(`booking/${booking_id}/`, {});
}

// Bookings of the current shift that were never posted to Zoho
export async function get_unposted_zoho_bookings() {
    return app_get('bookings/', { unposted_zoho: 1 });
}

// Rebuild Zoho line items for bookings created before zoho_line_items was
// stored: match the booking's square line items (options) against the
// zohoItems mapping in localStorage.
function rebuild_zoho_line_items(booking) {
    let allZohoItems;
    try {
        allZohoItems = JSON.parse(get_localstorage('zohoItems')) || {};
    } catch {
        return null;
    }
    const lineItems = [];
    for (const item of booking.options || []) {
        const mapping = allZohoItems[item.name];
        if (mapping) {
            lineItems.push({
                item_id: mapping[0],
                quantity: item.quantity,
                rate: mapping[1],
                tax_id: '5118629000000088105',
            });
        } else if (item.base_price_money?.amount > 0) {
            // Custom item — no catalog mapping; send name + net rate
            lineItems.push({
                name: item.name,
                quantity: item.quantity,
                rate: item.base_price_money.amount / 100 / 1.14,
                tax_id: '5118629000000088105',
            });
        }
    }
    return lineItems.length > 0 ? lineItems : null;
}

// Retry posting a booking's sales receipt to Zoho (End Shift page).
// On success, saves the receipt IDs on the booking and returns the updated booking.
export async function repost_booking_to_zoho({ booking, shiftDetails }) {
    const lineItems = booking.zoho_line_items?.length
        ? booking.zoho_line_items
        : rebuild_zoho_line_items(booking);
    if (!lineItems) {
        return { error: 'No Zoho line items stored for this booking and they could not be rebuilt.' };
    }

    const created = new Date(booking.created_at);
    const dateStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
    const dateTimeStr = `${dateStr} ${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}:${String(created.getSeconds()).padStart(2, '0')}`;

    const result = await app_api_get('zoho/', {
        request_type: 'post',
        url: '/salesreceipts',
        payload: {
            is_generic_customer: true,
            customer_name: 'Walk-in Customer',
            date: dateStr,
            line_items: lineItems,
            payment_mode: booking.payment?.method === 'cash' ? 'cash' : 'creditcard',
            custom_fields: [
                { label: 'Product',               value: 'Park' },
                { label: 'Gravity Branch',         value: shiftDetails.user.group_name },
                { label: 'Staff Name',             value: booking.creation_agent || shiftDetails.user.username },
                { label: 'Date and Time',          value: dateTimeStr },
                { label: 'Square receipt number',  value: booking.square_receipt_number },
            ],
        },
    });

    if (result.code !== 0) {
        return { error: result?.message || result?.error || 'Unknown Zoho error' };
    }

    try {
        const updated = await app_put(`booking/${booking.id}/`, {}, {
            zoho_sales_receipt_id: result.sales_receipt_details?.sales_receipt_id,
            zoho_sales_receipt_num: result.sales_receipt_details?.receipt_number,
        });
        return { booking: updated };
    } catch (err) {
        return { error: `Receipt created in Zoho but saving it on the booking failed: ${err.message}` };
    }
}

export async function update_booking_details({ bookingDetails, new_session_id }) {
    await app_put(`bookings/${new_session_id}/`, {}, bookingDetails);
    return true;
}

// ─── Square refund / Zoho delete ─────────────────────────────────────────────

export async function delete_booking_from_square({ bookingDetails, shiftDetails }) {
    const response = await app_api_get('square/', {
        request_type: 'post',
        url: '/refunds',
        payload: {
            payment_id: bookingDetails.square_payment_id,
            team_member_id: shiftDetails.square_team_member_id,
            amount_money: { currency: 'EGP', amount: bookingDetails.payment.amount * 100 },
        },
    });
    if (response.refund)  return true;
    if (response.error)   return { error: `${response.error}` };
    return { error: `${response.errors[0].detail}` };
}

export async function delete_booking_from_zoho({ zohoReceiptID }) {
    await app_api_get('zoho/', {
        request_type: 'delete',
        url: `/salesreceipts/${zohoReceiptID}`,
        payload: {},
    });
}

// ─── Session / product queries ────────────────────────────────────────────────

export async function get_product() {
    return app_get('products/', {});
}

export async function get_session_details(session_id) {
    return app_get(`session/${session_id}/`);
}

export async function get_available_sessions(payload) {
    return app_post('sessions/', { payload });
}

export async function get_old_bookings_for_spesific_session(session_id) {
    return app_get(`bookings/${session_id}/`, {});
}

// ─── Unused / kept for compatibility ─────────────────────────────────────────
// update_sales_receipt and create_customer are defined but not called from any page.
// Kept here in case they are used in future, but not exported to avoid dead imports.

export async function create_customer({ customerName }) {
    return app_post('customers/', { identifier: customerName });
}