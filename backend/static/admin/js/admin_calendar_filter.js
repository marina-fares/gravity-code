document.addEventListener("DOMContentLoaded", function () {
    let startTimeFilter = document.querySelector("input[name='start_time']");
    if (startTimeFilter) {
        startTimeFilter.type = "date";  // Converts input into a calendar picker
    }
});
