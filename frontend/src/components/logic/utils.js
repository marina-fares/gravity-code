// utils.js
export function safeJson(response) {
    return response.text().then(text => {
        try {
            return text ? JSON.parse(text) : {};
        } catch (e) {
            console.error("Invalid JSON response", text);
            return {};
        }
    });
}

// Temporary display fix: sessions stored in GMT need +3 hours shown for GMT+3.
// Only applies to sessions on or after 2026-06-12 (before that date the times
// are already correct in the DB). Remove this once the main-upgrade branch
// with the proper timezone handling is deployed.
const GMT3_CUTOFF = new Date('2026-06-12T00:00:00Z');

export function sessionDisplayDate(startTimeStr) {
    const date = new Date(startTimeStr);
    if (date >= GMT3_CUTOFF) {
        return new Date(date.getTime() + 3 * 60 * 60 * 1000);
    }
    return date;
}
