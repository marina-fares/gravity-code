import { app_api_get, app_api_put } from './apis';
import { set_shift, set_sub_shift } from './shifts_functions_apis';
import { app_post, app_delete, app_get, app_put } from './app';
import { set_localstorage } from './localstorage';

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
        delete bookingDetails.id;
        return app_post('booking/', bookingDetails);
    }
    if (bookingDetails.id) {
        return app_put(`booking/${bookingDetails.id}/`, {}, bookingDetails);
    }
    return app_post('booking/', bookingDetails);
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