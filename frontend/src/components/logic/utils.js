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
