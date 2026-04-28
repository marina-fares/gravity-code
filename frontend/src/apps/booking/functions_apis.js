// booking/functions_apis.js
// get_session_details and delete_booking_on_error live here because they are
// specific to the booking flow. get_promo_codes is booking-page-only.
// Note: get_session_details also exists in booking_functions.js — both call
// the same endpoint. External pages (block_seats, session_capacity) should
// import from booking_functions.js directly instead of this file.
import { app_get } from '../../components/logic/app';
import { app_api_get } from '../../components/logic/apis';

async function get_promo_codes() {
    return app_get('promo_code/', {});
}

async function get_session_details(session_id) {
    return app_get(`session/${session_id}/`);
}

async function delete_booking_on_error({ paymentData, shiftDetails, zohoReceiptID }) {
    if (paymentData?.id) {
        await app_api_get('square/', {
            request_type: 'post',
            url: '/refunds',
            payload: {
                payment_id: paymentData.id,
                team_member_id: shiftDetails.square_team_member_id,
                amount_money: {
                    currency: 'EGP',
                    amount: paymentData.total_money.amount,
                },
            },
        });
    }
    if (zohoReceiptID) {
        await app_api_get('zoho/', {
            request_type: 'delete',
            url: `/salesreceipts/${zohoReceiptID}`,
            payload: {},
        });
    }
}

function isRealCustomerName(value) {
  if (!value) return false;

  const v = value.trim();

  // reject datetime-like patterns
  if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(v)) {
    return false;
  }

  // must contain at least one letter
  if (!/[a-zA-Z]/.test(v)) {
    return false;
  }

  return true;
}

function get_all_customers() {
    return app_get('customers/', {});
}

export { get_promo_codes, get_session_details, delete_booking_on_error, isRealCustomerName, get_all_customers };